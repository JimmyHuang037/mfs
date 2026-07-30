import logging
from flask import Flask
from flask_cors import CORS
from config import Config


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.url_map.strict_slashes = False

    CORS(app)

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)
    app.logger.info("[APP] application starting")

    from app.auth.routes import auth_bp
    from app.students.routes import students_bp
    from app.scores.routes import scores_bp
    from app.teachers.routes import teachers_bp
    from app.classes.routes import classes_bp
    from app.statistics.routes import statistics_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(scores_bp, url_prefix='/api/scores')
    app.register_blueprint(teachers_bp, url_prefix='/api/teachers')
    app.register_blueprint(classes_bp, url_prefix='/api/classes')
    app.register_blueprint(statistics_bp, url_prefix='/api/statistics')

    app.logger.info("[APP] all blueprints registered: auth, students, scores, teachers, classes, statistics")

    return app
