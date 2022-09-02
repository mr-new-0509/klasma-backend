const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const {
  MESSAGE_USER_ALREADY_EXISTED,
  MESSAGE_INVALID_CREDENTIALS,
  MESSAGE_SERVER_ERROR,
  MESSAGE_USER_NOT_REGISTERED
} = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime } = require('../utils/functions');

/** Sign up by email */
exports.signupByEmail = async (req, res) => {
  const { email, password } = req.body.signupData;
  const { userType } = req.body;

  let user = null;
  let salt = null;
  let encryptedPassword = null;
  let newUser = null;
  let userId = 0;
  let userdata = null;
  let currentDateTime = getCurrentDateTime();

  //  Check whether a user already existed or not
  user = await (await db.query(`SELECT * FROM users WHERE email = '${email}'`))[0];
  if (user) {
    return res.status(400).send(MESSAGE_USER_ALREADY_EXISTED);
  }

  //  Encrypt password
  salt = await bcrypt.genSalt(10);
  encryptedPassword = await bcrypt.hash(password, salt);

  //  Insert a user into table "users"
  newUser = await db.query(`
    INSERT INTO users (email, password, id_status, email_verified, created_at)
    VALUES('${email}', '${encryptedPassword}', 3, 0, '${currentDateTime}')
  `);
  userId = newUser.insertId;

  if (userType == 'individual') {
    /* --------------------- If a user is individual ---------------------- */
    const { firstName, lastName } = req.body.signupData;
    let newIndividual = null;
    let individualId = 0;

    //  Insert a user into table "individuals"
    newIndividual = await db.query(`
      INSERT INTO individuals (first_name, last_name, id_user, phone_verified created_at)
      VALUES('${firstName}', '${lastName}', ${userId}, 0, '${currentDateTime}')
    `);
    individualId = newIndividual.insertId;

    //  Get userdata
    userdata = await (await db.query(`
      SELECT 
        individuals.id AS id_individual,
        individuals.first_name,
        individuals.last_name,
        individuals.bio,
        individuals.date_of_birth,
        individuals.country,
        individuals.state,
        individuals.city,
        individuals.postal_code,
        individuals.address,
        individuals.phone,
        individuals.avatar,
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE individuals.id = ${individualId}
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    /* -------------------------------------------------------------------- */
  } else {
    /* ---------------------- If a user is a company ----------------------- */
    const { companyName } = req.body.signupData;
    let newCompany = null;
    let companyId = 0;

    //  Insert a user into table "individuals"
    newCompany = await db.query(`
      INSERT INTO companies (name, id_user, created_at)
      VALUES('${companyName}', ${userId}, '${currentDateTime}')
    `);
    companyId = newCompany.insertId;

    //  Get userdata
    userdata = await (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.logo,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        users.email,
        users.google_id,
        users.email_verified
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE companies.id = ${companyId}
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    /* -------------------------------------------------------------------- */
  }
};

/** Sign up by google */
exports.signupByGoogle = async (req, res) => {
  const { userType } = req.body;
  const { googleId, avatar } = req.body.signupData;

  let user = null;
  let newUser = null;
  let userId = 0;
  let userdata = null;
  let currentDateTime = getCurrentDateTime();

  //  Check whether a user already existed or not
  user = await (await db.query(`SELECT * FROM users WHERE google_id = '${googleId}'`))[0];
  if (user) {
    return res.status(400).send(MESSAGE_USER_ALREADY_EXISTED);
  }

  //  Insert a user into table "users"
  newUser = await db.query(`
    INSERT INTO users (google_id, id_status, email_verified, created_at)
    VALUES('${googleId}', 3, 1, '${currentDateTime}')
  `);
  userId = newUser.insertId;

  if (userType == 'individual') {
    /* --------------------- If a user is individual ---------------------- */
    const { firstName, lastName } = req.body.signupData;

    //  Insert a user into table "individuals"
    newIndividual = await db.query(`
      INSERT INTO individuals (first_name, last_name, id_user, avatar, phone_verified, created_at)
      VALUES('${firstName}', '${lastName}', ${userId}, '${avatar}', 0, '${currentDateTime}')
    `);
    individualId = newIndividual.insertId;

    //  Get userdata
    userdata = await (await db.query(`
      SELECT 
        individuals.id AS id_individual,
        individuals.first_name,
        individuals.last_name,
        individuals.bio,
        individuals.date_of_birth,
        individuals.country,
        individuals.state,
        individuals.city,
        individuals.postal_code,
        individuals.address,
        individuals.phone,
        individuals.avatar,
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE individuals.id = ${individualId}
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    /* -------------------------------------------------------------------- */
  } else {
    /* ---------------------- If a user is a company ---------------------- */
    let newCompany = null;
    let companyId = 0;

    //  Insert a user into table "individuals"
    newCompany = await db.query(`
      INSERT INTO companies (id_user, created_at)
      VALUES(${userId}, '${currentDateTime}')
    `);
    companyId = newCompany.insertId;

    //  Get userdata
    userdata = await (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.logo,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        users.email,
        users.google_id,
        users.email_verified
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE companies.id = ${companyId}
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        return res.status(201).send(token);
      });
    /* -------------------------------------------------------------------- */
  }
};

/** Sign in by email */
exports.signinByEmail = async (req, res) => {
  const { signinData, userType } = req.body;
  const { email, password } = signinData;
  let userdata = null;
  let passwordMatched = false;

  if (userType === 'individual') {
    userdata = await (await db.query(`
      SELECT 
        individuals.id AS id_individual,
        individuals.first_name,
        individuals.last_name,
        individuals.bio,
        individuals.date_of_birth,
        individuals.country,
        individuals.state,
        individuals.city,
        individuals.postal_code,
        individuals.address,
        individuals.phone,
        individuals.avatar,
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified,
        users.password
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE users.email = '${email}' AND users.id_status = 3
    `))[0];
  } else {
    userdata = await (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.logo,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        users.email,
        users.google_id,
        users.email_verified,
        users.password
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE users.email = '${email}' AND users.id_status = 3
    `))[0];
  }

  if (!userdata) {
    return res.status(401).send(MESSAGE_USER_NOT_REGISTERED);
  }

  passwordMatched = await bcrypt.compare(password, userdata.password);
  if (!passwordMatched) {
    return res.status(400).send(MESSAGE_INVALID_CREDENTIALS);
  }

  delete userdata.password;

  jwt.sign({ ...userdata }, config.get('jwtSecret'), { expiresIn: '5 days' }, (error, token) => {
    if (error) {
      console.log('# error => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    }
    console.log('# token => ', token);
    return res.status(200).send(token);
  });
};