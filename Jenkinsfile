node {
    def newImage

/// Build
    stage('Checkout') {
        checkout scm
    }

    docker.withServer('unix:///var/run/docker.sock') {
        stage('Build') {
            /* This builds the actual image; synonymous to
            * docker build on the command line */
                newImage = docker.build("aws_server_manager_bot:${env.BUILD_ID}")
        }

    /// Test
        stage('Test image') {
            newImage.inside {
                sh 'echo "TEST| Run passed"'
            }
        }

    /// Deploy
        stage('Deploy container') {
            sh 'docker container rm -v -f AWSServerManagerBot'
            container = newImage.run("--restart always --name AWSServerManagerBot -v " + params.HOST_DATABASE_DIR + ":/usr/src/app/database -e DISCORD_TOKEN='" + params.DISCORD_TOKEN + "' -e AWS_ACCESS_KEY_ID='" + params.AWS_ACCESS_KEY_ID + "' -e AWS_SECRET_ACCESS_KEY='" + params.AWS_SECRET_ACCESS_KEY + "' -e SERVER_OWNER_DISCORD_ID='" + params.SERVER_OWNER_DISCORD_ID + "'")
        }
    }
}