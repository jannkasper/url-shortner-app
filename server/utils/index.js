
class CustomError extends Error {
    constructor(message, statusCode = 500, data) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.data = data;
    }
}

exports.CustomError = CustomError;
