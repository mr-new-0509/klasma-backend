const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const {
  MESSAGE_USER_ALREADY_EXISTED,
  MESSAGE_DB_ERROR,
  MESSAGE_SERVER_ERROR
} = require("../utils/constants");
const db = require("../utils/db");

/** Sign up by email */
exports.signupByEmail = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const user = await (await db.query(`SELECT * FROM users WHERE email = '${email}'`))[0];
  if (user) {
    return res.status(400).send(MESSAGE_USER_ALREADY_EXISTED);
  }

  const salt = await bcrypt.genSalt(10);
  const cryptedPassword = await bcrypt.hash(password, salt);

  db.query(`
    INSERT INTO users (first_name, last_name, email, password, register_by_email) 
    VALUES ('${firstName}', '${lastName}', '${email}', '${cryptedPassword}', 1);
  `)
    .then(() => {
      jwt.sign({ ...req.body }, config.get('jwtSecret'), { expiresIn: '5 days' }, (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    })
    .catch(error => {
      return res.status(500).send(MESSAGE_DB_ERROR);
    });
};

/** Sign up by google */
exports.signupByGoogle = async (req, res) => {
  const { googleId, firstName, lastName, avatar } = req.body;
  db.query(`
    INSERT INTO users (first_name, last_name, googleId, avatar) 
    VALUES ('${firstName}', '${lastName}', '${googleId}', '${avatar}');
  `)
    .then(() => {
      jwt.sign({ ...req.body }, config.get('jwtSecret'), { expiresIn: '5 days' }, (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    })
    .catch(error => {
      return res.status(500).send(MESSAGE_DB_ERROR);
    });
};

/** Sign in by email */
exports.signinByEmail = async (req, res) => {
  const { email, password } = req.body;

  const user = await (await db.query(`SELECT * FROM users WHERE email = '${email}'`))[0];
  if (!user) {
    return res.status(400).send(MESSAGE_INVALID_CREDENTIALS);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send(MESSAGE_INVALID_CREDENTIALS);
  }

  jwt.sign({ ...user }, config.get('jwtSecret'), { expiresIn: '5 days' }, (error, token) => {
    if (error) {
      console.log('# error => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    }
    console.log('# token => ', token);
    return res.status(200).send(token);
  });
};