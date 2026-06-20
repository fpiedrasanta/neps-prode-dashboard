// =====================================
// FUNCIÓN REUTILIZABLE PARA ENVÍO DE EMAILS
// =====================================
def enviarNotificacion(String estado, String extra = "") {
    def asunto = estado == 'SUCCESS' ? "✅ ${env.PROYECTO} desplegado en ${env.ENTORNO}" :
                 estado == 'FAILURE' ? "❌ Error en ${env.PROYECTO} - ${env.ENTORNO}" :
                                       "⚠️ ${env.PROYECTO} abortado - ${env.ENTORNO}"
    emailext(
        subject: asunto,
        body: """${asunto}\n${extra}\n\nProyecto: ${env.PROYECTO}\nEntorno: ${env.ENTORNO}\nBuild: #${env.BUILD_NUMBER}\nBranch: ${env.BRANCH_NAME}""",
        to: env.NOTIFICATION_EMAILS
    )
}

pipeline {
    agent any   // el controlador Linux ejecuta la verificación inicial

    environment {
        PROYECTO             = "prode-neps-dashboard"
        ENTORNO              = "main"
        NOTIFICATION_EMAILS  = "mmartina@neps.com.ar,fpiedrasanta@neps.com.ar"
    }

    stages {
        stage('Verificar política de despliegue') {
            steps {
                script {
                    def msg = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    def skip = ["#no-deploy","[JENKINS-AUTOMERGE]","[skip ci]","[ci skip]"].any { msg.toUpperCase().contains(it.toUpperCase()) }
                    if (skip) {
                        currentBuild.result = 'ABORTED'
                        error("🛑 Despliegue bloqueado por mensaje: ${msg}")
                    }
                }
            }
        }

        // Todo el despliegue se ejecuta en el agente Windows (sin SSH)
        stage('Desplegar en NEPS-APP01') {
            agent { label 'NEPS-APP01' }

            environment {
                DEPLOY_PATH          = "D:\\Sistemas\\neps\\prode\\neps-prode-dashboard"
                BACKUP_PATH          = "D:\\Sistemas\\backup\\prode\\neps-prode-dashboard"
                LOCAL_BACKUP_DIR     = "\\\\neps-app01\\D\\Sistemas\\backup\\prode\\bd"
                SQL_INSTANCE         = "NEPS-DEV02"
                DB_NAME              = "bd_neps_prode"
                MAX_BACKUPS          = "5"
                DEPLOY_SCRIPTS_PATH  = "Jenkins"
                SCRIPTS_PATH         = "00 - src\\Scripts"
                APPPOOL_NAMES        = "prode-dashboard"
                SQL_PORT             = "3307"
                NEED_RESTORE         = "false"
            }

            stages {
                stage('Detener AppPools') {
                    steps {
                        script {
                            try {
                                powershell """
                                    & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\restart-apppool.ps1' `
                                        -AppPoolNames '${APPPOOL_NAMES}' -Action 'Stop'
                                """
                                echo "✅ AppPools detenidos exitosamente"
                            } catch (Exception e) {
                                error("❌ Error crítico al detener servicios. Cancelando despliegue.")
                            }
                        }
                    }
                }

                stage('Configurar Git') {
                    steps {
                        withCredentials([string(credentialsId: 'github-token', variable: 'GIT_PAT')]) {
                            script {
                                def safePAT = GIT_PAT.replace('$', '`$')
                                powershell """
                                    Set-Location '${DEPLOY_PATH}'
                                    if (Test-Path '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\configure-git.ps1') {
                                        & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\configure-git.ps1' `
                                            -RepoPath '${DEPLOY_PATH}' -Token '${safePAT}' -FixLongPaths \$true
                                    }
                                    else {
                                        git config user.email "jenkins@neps.com.ar"
                                        git config user.name "Jenkins"
                                        git remote set-url origin https://${safePAT}@github.com/fpiedrasanta/prode-neps-dashboard.git
                                    }
                                """
                            }
                        }
                    }
                }

                stage('Backup BD') {
                    steps {
                        withCredentials([usernamePassword(
                            credentialsId: 'NEPS-SQL-SA',
                            usernameVariable: 'SQL_USER',
                            passwordVariable: 'SQL_PASS'
                        )]) {
                            powershell """
                                & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\backup-db-mysql.ps1' `
                                    -MySQLHost '${SQL_INSTANCE}' `
                                    -MySQLPort '${SQL_PORT}' `
                                    -Database '${DB_NAME}' `
                                    -LocalBackupPath '${LOCAL_BACKUP_DIR}' `
                                    -RemoteBackupPath '${BACKUP_PATH}\\bd' `
                                    -MySQLUser '${SQL_USER}' `
                                    -MySQLPass '${SQL_PASS}' `
                                    -MaxBackups ${MAX_BACKUPS}
                            """
                        }
                    }
                }

                stage('Backup binarios') {
                    steps {
                        powershell """
                            & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\backup-files-7zip.ps1' `
                                -Source '${DEPLOY_PATH}' -BackupDir '${BACKUP_PATH}\\binarios' `
                                -Proyecto '${PROYECTO}' -MaxBackups ${MAX_BACKUPS}
                        """
                    }
                }

                stage('Pull con rollback') {
                    steps {
                        powershell """
                            & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\pull-with-rollback.ps1' `
                                -DeployPath '${DEPLOY_PATH}' -BackupDir '${BACKUP_PATH}\\binarios' `
                                -Branch '${BRANCH_NAME}' -Proyecto '${PROYECTO}'
                        """
                    }
                }

                stage('Reiniciar AppPool') {
                    steps {
                        powershell """
                            & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\restart-apppool.ps1' `
                                -AppPoolNames '${APPPOOL_NAMES}' -Action 'Start'
                        """
                    }
                }

                stage('Restauración en caso de fallo') {
                    when { expression { return env.NEED_RESTORE == 'true' && currentBuild.result == 'FAILURE' } }
                    steps {
                        script {
                            withCredentials([usernamePassword(credentialsId: 'NEPS-SQL-SA', usernameVariable: 'SQL_USER', passwordVariable: 'SQL_PASS')]) {
                                powershell """
                                    \$script = '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\restore-db-mysql.ps1'
                                    if (-not (Test-Path \$script)) { throw "Script no encontrado" }
                                    & \$script -MySQLHost '${SQL_INSTANCE}' -MySQLPort '${SQL_PORT}' -Database '${DB_NAME}' `
                                        -BackupPath '${BACKUP_PATH}\\bd' -LocalBackupPath '${LOCAL_BACKUP_DIR}' `
                                        -MySQLUser '${SQL_USER}' -MySQLPass '${SQL_PASS}'
                                """
                            }
                            powershell """
                                & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\rollback.ps1' `
                                    -DeployPath '${DEPLOY_PATH}' -BackupDir '${BACKUP_PATH}\\binarios' -Proyecto '${PROYECTO}'
                            """
                            echo "Restauración ejecutada."
                        }
                    }
                }
            }

            post {
                always {
                    script {
                        // Iniciar AppPools (siempre)
                        try {
                            echo "🔄 Reiniciando AppPools: ${APPPOOL_NAMES}"
                            powershell """
                                & '${DEPLOY_PATH}\\${DEPLOY_SCRIPTS_PATH}\\restart-apppool.ps1' `
                                    -AppPoolNames '${APPPOOL_NAMES}' -Action 'Start'
                            """
                            echo "✅ AppPools reiniciados correctamente"
                        } catch (Exception e) {
                            echo "⚠️ Advertencia: Error al reiniciar AppPools: ${e.getMessage()}"
                        }
                    }
                }
            }
        }
    }

    post {
        aborted { enviarNotificacion("ABORTED") }
        success { enviarNotificacion("SUCCESS") }
        failure { enviarNotificacion("FAILURE") }
    }
}