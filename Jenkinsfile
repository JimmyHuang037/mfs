pipeline {
    agent any

    environment {
        PROD_HOST    = '172.30.115.241'
        PROD_USER    = 'jimmyuser2'
        TEST_BASE_URL = 'http://localhost:4201'
    }

    options {
        timestamps()
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
                sh """
                    docker run --rm --network host \
                        -v \$(pwd)/e2e:/app \
                        -w /app \
                        -e BASE_URL=${TEST_BASE_URL} \
                        mcr.microsoft.com/playwright:v1.52.0-noble \
                        bash -c "npm ci && npx playwright test"
                """
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
                                    "docker exec -i mfs-prod-mysql mysql -uroot -p\\\$MYSQL_ROOT_PASSWORD student_db < /tmp/\$(basename \$f) && rm /tmp/\$(basename \$f)"
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
                            "cd ~/mfs && git pull origin main && docker compose -f docker-compose.prod.yml up -d"

                        sleep 10
                        echo "[DEPLOY] Service status:"
                        ssh -o StrictHostKeyChecking=no ${PROD_USER}@${PROD_HOST} \
                            "docker compose -f docker-compose.prod.yml ps"
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
        always {
            cleanWs()
        }
    }
}
