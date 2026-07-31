pipeline {
    agent any

    environment {
        PROD_HOST     = '172.30.115.33'
        PROD_USER     = 'jimmyuser2'
        PROD_DIR      = 'mfs-prod'
        TEST_BASE_URL = 'http://localhost:4201'
    }

    options {
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('E2E Tests') {
            steps {
                catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                    sh """
                        if docker image inspect mcr.microsoft.com/playwright:v1.52.0-noble > /dev/null 2>&1; then
                            docker run --rm --network host \
                                -v \$(pwd)/e2e:/app \
                                -w /app \
                                -e BASE_URL=${TEST_BASE_URL} \
                                mcr.microsoft.com/playwright:v1.52.0-noble \
                                bash -c "npm ci && npx playwright test"
                        else
                            echo "[E2E] Playwright image not available, skipping tests."
                            echo "[E2E] Run: docker pull mcr.microsoft.com/playwright:v1.52.0-noble"
                            exit 1
                        fi
                    """
                }
            }
        }

        stage('Build Images') {
            steps {
                sh 'docker compose -f docker-compose.prod.yml build'
            }
        }

        stage('DB Migration') {
            steps {
                sshagent(credentials: ['jimmyuser2-ssh']) {
                    sh """
                        FILES=\$(ls db/migrations/*.sql 2>/dev/null | sort)
                        if [ -n "\$FILES" ]; then
                            echo "[MIGRATE] Executing migration files..."
                            for f in \$FILES; do
                                echo "[MIGRATE] \$f"
                                scp -o StrictHostKeyChecking=no "\$f" ${PROD_USER}@${PROD_HOST}:/tmp/
                                ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} \
                                    "source ~/${PROD_DIR}/.env && docker exec -i mfs-prod-mysql mysql -uroot -p\\\$MYSQL_ROOT_PASSWORD student_db < /tmp/\$(basename \$f) && rm /tmp/\$(basename \$f)"
                            done
                        else
                            echo "[MIGRATE] No migrations, skipping."
                        fi
                    """
                }
            }
        }

        stage('Deploy to Production') {
            steps {
                sshagent(credentials: ['jimmyuser2-ssh']) {
                    sh """
                        echo "[DEPLOY] Transferring images..."
                        docker save mfs-prod-api mfs-prod-web | \
                            ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} docker load

                        echo "[DEPLOY] Restarting services..."
                        ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} \
                            "cd ~/${PROD_DIR} && docker compose up -d"

                        sleep 10
                        echo "[DEPLOY] Service status:"
                        ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} \
                            "cd ~/${PROD_DIR} && docker compose ps"
                    """
                }
            }
        }
    }

    post {
        success {
            echo '✅ Deployed to production successfully.'
        }
        failure {
            echo '❌ Pipeline failed — check logs above.'
        }
    }
}
