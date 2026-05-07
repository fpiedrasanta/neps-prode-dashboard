// =====================================
// FUNCIÃ“N REUTILIZABLE PARA SSH SEGURO
// =====================================
def ejecutarSSH(String comandoRemoto) {
    // Convertir a base64 para evitar problemas de caracteres
    String base64Command = powershell(returnStdout: true, script: """
        \$command = @'
${comandoRemoto}
'@
        \$bytes = [System.Text.Encoding]::Unicode.GetBytes(\$command)
        [Convert]::ToBase64String(\$bytes)
    """).trim()

    // Construir comando SSH
    String sshCommand = "ssh -i '${env.CORRECTED_KEY_PATH}' " +
                       "-o StrictHostKeyChecking=no " +
                       "'${env.REMOTE_USER}@${env.REMOTE_HOST}' " +
                       "\"powershell -EncodedCommand $base64Command\""
    
    // Ejecutar con registro seguro
    echo "ðŸš€ Ejecutando comando remoto (base64 encoded)"
    def status = powershell(
        script: """
            ${sshCommand}
            if (\$LASTEXITCODE -ne 0) { exit \$LASTEXITCODE }
        """,
        returnStatus: true
    )
    
    if (status != 0) {
        error("âŒ Error SSH (CÃ³digo: ${status})")
    }
}

// =====================================
// CORREGIR PERMISOS UNA SOLA VEZ 
// =====================================
def corregirPermisosClave() {
    withCredentials([file(credentialsId: 'ssh-neps-key-file', variable: 'SSH_KEY_FILE')]) {
        env.CORRECTED_KEY_PATH = powershell(returnStdout: true, script: '''
            $path = [System.IO.Path]::Combine(
                [System.IO.Path]::GetTempPath(),
                [System.IO.Path]::GetRandomFileName() + ".key"
            )
            
            Copy-Item -Path "$env:SSH_KEY_FILE" -Destination $path -Force
            icacls $path /reset > $null
            icacls $path /grant "${env:REMOTE_USER}:R" > $null  # Â¡Sin parÃ©ntesis!
            icacls $path /grant "NT AUTHORITY\\SYSTEM:F" > $null
            $path  # Solo devuelve la ruta
        ''').trim()
        
        echo "ðŸ”‘ Clave SSH corregida en: ${env.CORRECTED_KEY_PATH}"
    }
}

// =====================================
// FUNCIÃ“N REUTILIZABLE PARA ENVÃO DE EMAILS
// =====================================
def enviarNotificacion(String estado, String mensajePersonalizado = "") {
    // ConfiguraciÃ³n bÃ¡sica del email
    def asunto = ""
    def cuerpo = ""
    
    // Personalizar segÃºn el estado
    switch(estado.toUpperCase()) {
        case "SUCCESS":
            asunto = "âœ… Despliegue Exitoso - ${env.PROYECTO} - ${env.ENTORNO}"
            cuerpo = "El despliegue se completÃ³ correctamente."
            break
        case "FAILURE":
            asunto = "âŒ Error en Despliegue - ${env.PROYECTO} - ${env.ENTORNO}"
            cuerpo = "El despliegue encontrÃ³ errores."
            break
        case "ABORTED":
            asunto = "âš ï¸ Despliegue Abortado - ${env.PROYECTO} - ${env.ENTORNO}"
            cuerpo = "El despliegue fue cancelado."
            break
        default:
            asunto = "ðŸ“¦ NotificaciÃ³n de Despliegue - ${env.PROYECTO} - ${env.ENTORNO}"
            cuerpo = "Estado del despliegue: ${estado}"
    }
    
    // Agregar mensaje personalizado si se proporciona
    if (mensajePersonalizado) {
        cuerpo += "\n\n${mensajePersonalizado}"
    }
    
    // Agregar informaciÃ³n comÃºn
	cuerpo += """
		\n
		----------------------------------------
		Proyecto: ${env.PROYECTO}
		Entorno: ${env.ENTORNO}
		Build: #${env.BUILD_NUMBER}
		Branch: ${env.BRANCH_NAME}
		URL del Build: ${env.BUILD_URL}
		----------------------------------------
		"""
    
    // Enviar email usando el plugin Email Extension 
    emailext(
        subject: asunto,
        body: cuerpo,
        to: env.NOTIFICATION_EMAILS
    )
} 
 
pipeline {
    agent any

    environment {
        REMOTE_HOST          = "NEPS-APP01"
        REMOTE_USER          = "neps\\jenkins"
        DEPLOY_PATH          = "D:\\Sistemas\\neps\\prode\\neps-prode-dashboard"
        BACKUP_PATH          = "D:\\Sistemas\\backup\\prode\\neps-prode-dashboard"
        LOCAL_BACKUP_DIR     = "\\\\neps-app01\\D\\Sistemas\\backup\\prode\\bd"
        SQL_INSTANCE         = "NEPS-DEV02"
        DB_NAME              = "bd_neps_prode"
        MAX_BACKUPS          = "5"
        PROYECTO             = "prode-neps-dashboard"
        DEPLOY_SCRIPTS_PATH  = "Jenkins"
        SCRIPTS_PATH         = "00 - src\\Scripts"
        ENTORNO              = "main" 
        NOTIFICATION_EMAILS  = "mmartina@neps.com.ar,fpiedrasanta@neps.com.ar"
		APPPOOL_NAMES		 = "prode-dashboard"
		SQL_PORT         	 = "3307"
		NEED_RESTORE         = "false"
    }

    stages {
        stage('Verificar politica de despliegue') {
            steps {
                script {
                    COMMIT_MSG = powershell(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    
                    def skipPatterns = [
                        "#no-deploy",
                        "[JENKINS-AUTOMERGE]",
                        "[skip ci]",
                        "[ci skip]"
                    ]
                    
                    def shouldSkip = skipPatterns.any { pattern -> 
                        COMMIT_MSG.toUpperCase().contains(pattern.toUpperCase()) 
                    }
                    
                    if (shouldSkip) {
                        def reason = skipPatterns.find { COMMIT_MSG.toUpperCase().contains(it.toUpperCase()) }
                        echo """
                        âš ï¸ Pipeline detenido por polÃ­tica de despliegue
                        Commit message: ${COMMIT_MSG}
                        Motivo: Contiene '${reason}'
                        """
                        currentBuild.result = 'ABORTED'
                        error("ðŸ›‘ Pipeline detenido: el mensaje del commit contiene '${reason}'")
                    }
                }
            }
        }
       	   
        stage('Preparar Entorno Git') {
            steps {
			
				withCredentials([string(credentialsId: 'github-token', variable: 'GIT_PAT')]) {
					script {
						try {
							def safePAT = GIT_PAT.replace('$', '`$')  // Escapar $ para PowerShell
							String powerShellTrue = '$true'  // Escapa el dólar para PowerShell

							ejecutarSSH("""
								& '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\configure-git.ps1' `
									-RepoPath '${env.DEPLOY_PATH}' `
									-Token '${safePAT}' `
									-FixLongPaths ${powerShellTrue}
							""")
							
						} catch (err) {
							error("? Error al preparar entorno git: ${err.message}")
						}
					}
				}
            }
        }
		
		stage('Detener apppools') {
			steps {
				script {
					try {
						echo "🔄 Deteniendo AppPools: ${env.APPPOOL_NAMES}"
						ejecutarSSH("""
							& '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\restart-apppool.ps1' `
								-AppPoolNames '${env.APPPOOL_NAMES}' `
                                -Action 'Stop'
						""")
						echo "✅ AppPools detenidos correctamente"
					} catch (Exception e) {
						error("❌ Error critico al detener servicios. Cancelando despliegue.")
						// Esto detendrá inmediatamente el pipeline
					}
				}
			}
		}
    
        stage('Backup Base de Datos') {
			steps {
				script {
					try {
						withCredentials([usernamePassword(
							credentialsId: 'NEPS-SQL-SA', 
							usernameVariable: 'SQL_USER', 
							passwordVariable: 'SQL_PASS'
						)]) {
							// 🔥 FORMATO MEJORADO - Usando comillas simples y escapado correcto
							ejecutarSSH("""
								& '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\backup-db-mysql.ps1' `
								-MySQLHost '${env.SQL_INSTANCE}' `
								-MySQLPort '${env.SQL_PORT}' `
								-Database '${env.DB_NAME}' `
								-LocalBackupPath '${env.LOCAL_BACKUP_DIR}' `
								-RemoteBackupPath '${env.BACKUP_PATH}\\bd' `
								-MySQLUser '${SQL_USER}' `
								-MySQLPass '${SQL_PASS}' `
								-MaxBackups ${env.MAX_BACKUPS}
							""".replace('\n', ' ').trim())
						}
					} catch (err) {
						error("❌ Error al hacer backup de la base de datos: ${err.message}")
					}
				}
			}
		}

        stage('Backup de Archivos Binarios') {
            steps {
                script {
                    try {
                        ejecutarSSH("""
                            & '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\backup-files-7zip.ps1' `
                                -Source '${env.DEPLOY_PATH}' `
                                -BackupDir '${env.BACKUP_PATH}\\binarios' `
                                -Proyecto '${env.PROYECTO}' `
                                -MaxBackups ${env.MAX_BACKUPS}
                        """)
                    } catch (err) {
                        error("âŒ Error al hacer backup de archivos binarios: ${err.message}")
                    }
                }
            }
        }

		stage('Actualizar Codigo desde Git con Rollback') {
            steps {
                script {
                    try {
                        ejecutarSSH("""
                            & '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\pull-with-rollback.ps1' `
                                -DeployPath '${env.DEPLOY_PATH}' `
                                -BackupDir '${env.BACKUP_PATH}\\binarios' `
                                -Branch '${env.BRANCH_NAME}' `
                                -Proyecto '${env.PROYECTO}'
                        """)
                    } catch (err) {
                        error("âŒ Error al hacer git pull con rollback: ${err.message}")
                    }
                }
            }
        }
		
    }
    
    post {
        aborted {
            script {
                enviarNotificacion("ABORTED", "El despliegue fue cancelado manualmente o por polÃ­ticas de despliegue.")
            }
        }
        success {
            script {
                enviarNotificacion("SUCCESS", "Todos los pasos del despliegue se completaron exitosamente.")
            }
        }
        failure {
            script {
				enviarNotificacion("FAILURE", "Todos los pasos del despliegue se completaron exitosamente.")
            }
        }
        always {
            echo "ðŸ“‹ Pipeline completo. Resultado: ${currentBuild.currentResult}"
            
            // Limpiar clave corregida
            script {
			
                // 2. Reiniciar AppPools (siempre)
                try {
                    echo "🔄 Reiniciando AppPools: ${env.APPPOOL_NAMES}"
                    ejecutarSSH("""
                        & '${env.DEPLOY_PATH}\\${env.DEPLOY_SCRIPTS_PATH}\\restart-apppool.ps1' `
                            -AppPoolNames '${env.APPPOOL_NAMES}'`
                                -Action 'Start'
                    """)
                    echo "✅ AppPools reiniciados correctamente"
                } catch (Exception e) {
                    echo "⚠️ Advertencia: Error al reiniciar AppPools en post-always: ${e.getMessage()}"
                    // No usamos error() para no fallar el pipeline en post-always
                }
			
                if (env.CORRECTED_KEY_PATH) {
                    // Limpiar solo si el archivo existe
                    def status = powershell(returnStatus: true, script: """
                        if (Test-Path '${env.CORRECTED_KEY_PATH}') {
                            Remove-Item '${env.CORRECTED_KEY_PATH}' -Force
                            exit 0
                        }
                        exit 1
                    """)
                    
                    if (status == 0) {
                        echo "ðŸ—‘ï¸ Clave SSH temporal eliminada: ${env.CORRECTED_KEY_PATH}"
                    }
                }
            }
        }
    }
} 