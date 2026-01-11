from flask import Flask

from app.gitreader import gitreader


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(gitreader, url_prefix='/gitreader')
    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
