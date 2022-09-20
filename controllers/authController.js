const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const {
  MESSAGE_USER_ALREADY_EXISTED,
  MESSAGE_INVALID_CREDENTIALS,
  MESSAGE_SERVER_ERROR,
  MESSAGE_USER_NOT_REGISTERED,
  MESSAGE_INCORRECT_CURRENT_PASSWORD,
  ID_OF_STATUS_APPROVED,
  ID_OF_USER_TYPE_INDIVIDUAL,
  ID_OF_USER_TYPE_COMPANY,
  VALUE_OF_UNVERIFIED,
  VALUE_OF_VERIFIED,
  SITE_BASIC_URL,
  COMPANY_EMAIL,
  MESSAGE_EMAIL_SENT_SUCCESS,
  MESSAGE_EMAIL_SENT_FAILED,
  MESSAGE_EMAIL_VERIFY_FAILED
} = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime, getDateTimeString } = require('../utils/functions');
const Sib = require('../utils/Sib');

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
  user = await (await db.query(`SELECT * FROM users WHERE email = "${email}"`))[0];
  if (user) {
    return res.status(400).send(MESSAGE_USER_ALREADY_EXISTED);
  }

  //  Encrypt password
  salt = await bcrypt.genSalt(10);
  encryptedPassword = await bcrypt.hash(password, salt);

  if (userType == 'individual') {
    //  Insert a user into table "users"
    newUser = await db.query(`
      INSERT INTO users (
        email, 
        password, 
        id_status, 
        email_verified, 
        id_user_type, 
        created_at
      ) VALUES(
        "${email}", 
        "${encryptedPassword}", 
        ${ID_OF_STATUS_APPROVED}, 
        ${VALUE_OF_UNVERIFIED}, 
        ${ID_OF_USER_TYPE_INDIVIDUAL}, 
        "${currentDateTime}"
      );
    `);
    userId = newUser.insertId;

    /* --------------------- If a user is individual ---------------------- */
    const { firstName, lastName } = req.body.signupData;
    let newIndividual = null;
    let individualId = 0;

    //  Insert a user into table "individuals"
    newIndividual = await db.query(`
      INSERT INTO individuals (first_name, last_name, id_user, phone_verified, created_at)
      VALUES("${firstName}", "${lastName}", ${userId}, ${VALUE_OF_UNVERIFIED}, "${currentDateTime}");
    `);
    individualId = newIndividual.insertId;

    //  Get userdata
    userdata = (await db.query(`
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
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE individuals.id = ${individualId}
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      async (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }

        /* ------------------- Send email verification link ------------------ */
        const user = (await db.query(`SELECT * FROM users WHERE id = ${userId};`))[0];
        jwt.sign(
          { ...user },
          config.get('jwtSecret'),
          { expiresIn: "2h" },
          (error, tokenToVerify) => {
            if (error) {
              console.log('# error => ', error);
              return res.status(500).send(MESSAGE_500);
            }

            const tranEmailApi = new Sib.TransactionalEmailsApi();
            let sender = { email: COMPANY_EMAIL };
            let receivers = [{ email: user.email }];

            let mailOptions = {
              sender,
              to: receivers,
              subject: 'Please verify your email address.',
              htmlContent: `<a href="${SITE_BASIC_URL}/email-verify/${tokenToVerify}">
                Click Here to verify your email address.
              </a>`
            };

            //  Send receiver an email.
            tranEmailApi.sendTransacEmail(mailOptions)
              .then((result) => {
                console.log('# result => ', result);
                return res.status(201).send(token);
              })
              .catch(error => {
                console.log('# error => ', error);
                return res.status(500).send(MESSAGE_EMAIL_SENT_FAILED);
              });
          });
        /* ------------------------------------------------------------------- */
      });
    /* -------------------------------------------------------------------- */
  } else {
    //  Insert a user into table "users"
    newUser = await db.query(`
      INSERT INTO users (
        email, 
        password, 
        id_status, 
        email_verified, 
        id_user_type, 
        created_at
      ) VALUES(
        "${email}", 
        "${encryptedPassword}", 
        ${ID_OF_STATUS_APPROVED}, 
        ${VALUE_OF_UNVERIFIED}, 
        ${ID_OF_USER_TYPE_COMPANY}, 
        "${currentDateTime}"
      );
    `);
    userId = newUser.insertId;

    /* ---------------------- If a user is a company ----------------------- */
    const { companyName } = req.body.signupData;
    let newCompany = null;
    let companyId = 0;

    //  Insert a user into table "individuals"
    newCompany = await db.query(`
      INSERT INTO companies (name, id_user, created_at, phone_verified)
      VALUES("${companyName}", ${userId}, "${currentDateTime}", ${VALUE_OF_UNVERIFIED})
    `);
    companyId = newCompany.insertId;

    //  Get userdata
    userdata = (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        companies.phone,
        companies.phone_verified,
        companies.date_of_birth,
        users.email,
        users.google_id,
        users.email_verified,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE companies.id = ${companyId};
    `))[0];

    //  Make access token of userdata
    jwt.sign(
      { ...userdata },
      config.get('jwtSecret'),
      { expiresIn: '5 days' },
      async (error, token) => {
        if (error) {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_SERVER_ERROR);
        }
        /* ------------------- Send email verification link ------------------ */
        const user = (await db.query(`SELECT * FROM users WHERE id = ${userId};`))[0];
        jwt.sign(
          { ...user },
          config.get('jwtSecret'),
          { expiresIn: "2h" },
          (error, tokenToVerify) => {
            if (error) {
              console.log('# error => ', error);
              return res.status(500).send(MESSAGE_500);
            }

            const tranEmailApi = new Sib.TransactionalEmailsApi();
            let sender = { email: COMPANY_EMAIL };
            let receivers = [{ email: user.email }];

            let mailOptions = {
              sender,
              to: receivers,
              subject: 'Please verify your email address.',
              htmlContent: `<a href="${SITE_BASIC_URL}/email-verify/${tokenToVerify}">
                Click Here to verify your email address.
              </a>`
            };

            //  Send receiver an email.
            tranEmailApi.sendTransacEmail(mailOptions)
              .then((result) => {
                console.log('# result => ', result);
                return res.status(201).send(token);
              })
              .catch(error => {
                console.log('# error => ', error);
                return res.status(500).send(MESSAGE_EMAIL_SENT_FAILED);
              });
          });
        /* ------------------------------------------------------------------- */
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
  user = await (await db.query(`SELECT * FROM users WHERE google_id = "${googleId}";`))[0];
  if (user) {
    return res.status(400).send(MESSAGE_USER_ALREADY_EXISTED);
  }

  if (userType == 'individual') {
    //  Insert a user into table "users"
    newUser = await db.query(`
      INSERT INTO users (
        google_id, 
        id_status, 
        email_verified, 
        id_user_type, 
        avatar,
        created_at
      ) VALUES(
        "${googleId}", 
        ${ID_OF_STATUS_APPROVED}, 
        ${VALUE_OF_VERIFIED}, 
        ${ID_OF_USER_TYPE_INDIVIDUAL}, 
        "${avatar}"
        "${currentDateTime}"
      );
    `);
    userId = newUser.insertId;

    /* --------------------- If a user is individual ---------------------- */
    const { firstName, lastName } = req.body.signupData;

    //  Insert a user into table "individuals"
    newIndividual = await db.query(`
      INSERT INTO individuals (
        first_name, 
        last_name, 
        id_user, 
        phone_verified, 
        created_at
      ) VALUES(
        "${firstName}", 
        "${lastName}", 
        ${userId}, 
        ${VALUE_OF_UNVERIFIED}, 
        "${currentDateTime}"
      );
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
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE individuals.id = ${individualId};
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
    //  Insert a user into table "users"
    newUser = await db.query(`
      INSERT INTO users (
        google_id, 
        id_status, 
        email_verified, 
        id_user_type, 
        avatar,
        created_at
      ) VALUES(
        "${googleId}", 
        ${ID_OF_STATUS_APPROVED}, 
        ${VALUE_OF_VERIFIED}, 
        ${ID_OF_USER_TYPE_COMPANY}, 
        "${avatar}"
        "${currentDateTime}"
      );
    `);
    userId = newUser.insertId;

    /* ---------------------- If a user is a company ---------------------- */
    let newCompany = null;
    let companyId = 0;

    //  Insert a user into table "individuals"
    newCompany = await db.query(`
      INSERT INTO companies (id_user, created_at, phone_verified)
      VALUES(${userId}, "${currentDateTime}", ${VALUE_OF_VERIFIED});
    `);
    companyId = newCompany.insertId;

    //  Get userdata
    userdata = await (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        companies.phone,
        companies.phone_verified,
        companies.date_of_birth,
        users.email,
        users.google_id,
        users.email_verified,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE companies.id = ${companyId};
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
        individuals.phone_verified,
        individuals.id_user,
        users.email,
        users.google_id,
        users.email_verified,
        users.password,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM individuals 
      LEFT JOIN users ON individuals.id_user = users.id
      WHERE users.email = "${email}" AND users.id_status = ${ID_OF_STATUS_APPROVED};
    `))[0];
  } else {
    userdata = await (await db.query(`
      SELECT 
        companies.id AS id_company,
        companies.name AS company_name,
        companies.bio,
        companies.site_url,
        companies.country,
        companies.state,
        companies.city,
        companies.postal_code,
        companies.address,
        companies.id_user,
        companies.phone,
        companies.phone_verified,
        companies.date_of_birth,
        users.email,
        users.google_id,
        users.email_verified,
        users.password,
        users.avatar,
        users.wallet_address,
        users.id_user_type
      FROM companies 
      LEFT JOIN users ON companies.id_user = users.id
      WHERE users.email = "${email}" AND users.id_status = ${ID_OF_STATUS_APPROVED};
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

/** Update a user's profile */
exports.updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const {
    avatar,
    company_name,
    first_name,
    last_name,
    bio,
    phone,
    date_of_birth,
    country,
    state,
    city,
    address,
    postal_code
  } = req.body;
  let updatedUser = null;
  const currentDateTime = getCurrentDateTime();

  await db.query(`
    UPDATE users SET avatar = "${avatar}", updated_at = "${currentDateTime}" WHERE id = ${id};
  `);

  if (company_name) {
    await db.query(`
      UPDATE companies
      SET 
        name = "${String(company_name).replace(/"/g, '\'\'')}",
        bio = "${String(bio).replace(/"/g, '\'\'')}",
        phone = "${phone}",
        ${date_of_birth ? `date_of_birth = "${date_of_birth}",` : ''}
        country = "${String(country).replace(/"/g, '\'\'')}",
        state = "${String(state).replace(/"/g, '\'\'')}",
        city = "${String(city).replace(/"/g, '\'\'')}",
        address = "${String(address).replace(/"/g, '\'\'')}",
        postal_code = "${String(postal_code).replace(/"/g, '\'\'')}",
        updated_at = "${currentDateTime}"
      WHERE id_user = ${id};
    `).then(async () => {
      //  Get updated userdata
      updatedUser = (await db.query(`
        SELECT 
          companies.id AS id_company,
          companies.name AS company_name,
          companies.bio,
          companies.site_url,
          companies.country,
          companies.state,
          companies.city,
          companies.postal_code,
          companies.address,
          companies.id_user,
          companies.phone,
          companies.phone_verified,
          companies.date_of_birth,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM users 
        LEFT JOIN companies ON companies.id_user = users.id
        WHERE users.id = ${id};
      `))[0];

      //  Make access token of updated userdata
      jwt.sign(
        { ...updatedUser },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          return res.status(201).send(token);
        });
    }).catch(error => {
      console.log('>>>>>>>>> error of updateUserProfile - company => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    });
  } else {
    await db.query(`
      UPDATE individuals
      SET 
        first_name = "${String(first_name).replace(/"/g, '\'\'')}",
        last_name = "${String(last_name).replace(/"/g, '\'\'')}",
        bio = "${String(bio).replace(/"/g, '\'\'')}",
        phone = "${phone}",
        ${date_of_birth ? `date_of_birth = "${date_of_birth}",` : ''}
        country = "${String(country).replace(/"/g, '\'\'')}",
        state = "${String(state).replace(/"/g, '\'\'')}",
        city = "${String(city).replace(/"/g, '\'\'')}",
        address = "${String(address).replace(/"/g, '\'\'')}",
        postal_code = "${String(postal_code).replace(/"/g, '\'\'')}",
        updated_at = "${currentDateTime}"
      WHERE id_user = ${id};
    `).then(async () => {
      //  Get userdata
      updatedUser = (await db.query(`
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
          individuals.phone_verified,
          individuals.id_user,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM users 
        LEFT JOIN individuals ON individuals.id_user = users.id
        WHERE users.id = ${id}
      `))[0];

      //  Make access token of updated userdata
      jwt.sign(
        { ...updatedUser },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          return res.status(201).send(token);
        });
    })
      .catch(error => {
        console.log('>>>>>>>>> error of updateUserProfile - company => ', error);
        return res.status(500).send(MESSAGE_SERVER_ERROR);
      });
  }
};

/** Update a user's password */
exports.updateUserPassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  let currentPasswordMatched = false;
  let updatedUser = null;
  let salt = null;
  let encryptedPassword = null;
  const userdata = (await db.query(`SELECT * FROM users WHERE id = ${id};`))[0];
  const currentDateTime = getCurrentDateTime();

  try {
    currentPasswordMatched = await bcrypt.compare(currentPassword, userdata.password);
    if (!currentPasswordMatched) {
      return res.status(400).send(MESSAGE_INCORRECT_CURRENT_PASSWORD);
    }

    //  Encrypt password
    salt = await bcrypt.genSalt(10);
    encryptedPassword = await bcrypt.hash(newPassword, salt);

    await db.query(`
      UPDATE users 
      SET password = "${encryptedPassword}", updated_at = "${currentDateTime}" 
      WHERE id = ${id};
    `);

    if (userdata.id_user_type == ID_OF_USER_TYPE_COMPANY) {
      //  Get updated userdata
      updatedUser = (await db.query(`
        SELECT 
          companies.id AS id_company,
          companies.name AS company_name,
          companies.bio,
          companies.site_url,
          companies.country,
          companies.state,
          companies.city,
          companies.postal_code,
          companies.address,
          companies.id_user,
          companies.phone,
          companies.phone_verified,
          companies.date_of_birth,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM users 
        LEFT JOIN companies ON companies.id_user = users.id
        WHERE users.id = ${id};
      `))[0];

      //  Make access token of updated userdata
      jwt.sign(
        { ...updatedUser },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          return res.status(201).send(token);
        });
    } else {
      //  Get userdata
      updatedUser = (await db.query(`
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
          individuals.phone_verified,
          individuals.id_user,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM users 
        LEFT JOIN individuals ON individuals.id_user = users.id
        WHERE users.id = ${id}
      `))[0];

      //  Make access token of updated userdata
      jwt.sign(
        { ...updatedUser },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          return res.status(201).send(token);
        });
    }
  } catch (error) {
    console.log('>>>>>>>>> error of updateUserPassword => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Send email verification link */
exports.resendEmailVerificationLink = async (req, res) => {
  const { id } = req.params;
  try {
    const user = (await db.query(`SELECT * FROM users WHERE id = ${id};`))[0];
    jwt.sign({ ...user }, config.get('jwtSecret'), { expiresIn: "2h" }, (error, token) => {
      if (error) {
        console.log('# error => ', error);
        return res.status(500).send(MESSAGE_500);
      }

      const tranEmailApi = new Sib.TransactionalEmailsApi();
      let sender = { email: COMPANY_EMAIL };
      let receivers = [{ email: user.email }];

      let mailOptions = {
        sender,
        to: receivers,
        subject: 'Please verify your email address.',
        htmlContent: `<a href="${SITE_BASIC_URL}/email-verify/${token}">
          Click Here to verify your email address.
        </a>`
      };

      //  Send receiver an email.
      tranEmailApi.sendTransacEmail(mailOptions)
        .then((result) => {
          console.log('# result => ', result);
          return res.status(200).send(MESSAGE_EMAIL_SENT_SUCCESS);
        })
        .catch(error => {
          console.log('# error => ', error);
          return res.status(500).send(MESSAGE_EMAIL_SENT_FAILED);
        });
    });
  } catch (error) {
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Verify email */
exports.verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const currentDateTime = getCurrentDateTime();
  let userdata = null;

  jwt.verify(verificationToken, config.get('jwtSecret'), async (error, user) => {
    if (error) {
      return res.status(401).send(MESSAGE_EMAIL_VERIFY_FAILED);
    }
    console.log('>>>>>> user => ', user);
    try {
      if (user.id_user_type == ID_OF_USER_TYPE_COMPANY) {
        userdata = (await db.query(`
          SELECT 
            companies.id AS id_company,
            companies.name AS company_name,
            companies.bio,
            companies.site_url,
            companies.country,
            companies.state,
            companies.city,
            companies.postal_code,
            companies.address,
            companies.id_user,
            companies.phone,
            companies.phone_verified,
            companies.date_of_birth,
            users.email,
            users.google_id,
            users.email_verified,
            users.avatar,
            users.wallet_address,
            users.id_user_type
          FROM companies 
          LEFT JOIN users ON companies.id_user = users.id
          WHERE users.id = ${user.id};
        `))[0];

        if (user) {
          await db.query(`
            UPDATE users 
            SET email_verified = ${VALUE_OF_VERIFIED}, updated_at = "${currentDateTime}"
            WHERE id = ${user.id};
          `);
          userdata.email_verified = VALUE_OF_VERIFIED;
          jwt.sign(
            { ...userdata },
            config.get('jwtSecret'),
            { expiresIn: '5 days' },
            (error, token) => {
              if (error) {
                console.log('# error => ', error);
                return res.status(500).send(MESSAGE_SERVER_ERROR);
              }
              console.log('# token => ', token);
              return res.status(200).send(token);
            });
        } else {
          return res.status(500).send(MESSAGE_USER_NOT_REGISTERED);
        }
      } else {
        userdata = (await db.query(`
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
            individuals.phone_verified,
            individuals.id_user,
            users.email,
            users.google_id,
            users.email_verified,
            users.avatar,
            users.wallet_address,
            users.id_user_type
          FROM individuals 
          LEFT JOIN users ON individuals.id_user = users.id
          WHERE users.id = ${user.id};
        `))[0];

        if (user) {
          await db.query(`
            UPDATE users 
            SET email_verified = ${VALUE_OF_VERIFIED}, updated_at = "${currentDateTime}"
            WHERE id = ${user.id};
          `);
          userdata.email_verified = VALUE_OF_VERIFIED;
          jwt.sign(
            { ...userdata },
            config.get('jwtSecret'),
            { expiresIn: '5 days' },
            (error, token) => {
              if (error) {
                console.log('# error => ', error);
                return res.status(500).send(MESSAGE_SERVER_ERROR);
              }
              console.log('# token => ', token);
              return res.status(200).send(token);
            });
        } else {
          return res.status(500).send(MESSAGE_USER_NOT_REGISTERED);
        }
      }
    } catch (error1) {
      console.log('>>>>>>>> error => error of verifyEmail => ', error1);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    }
  });
};

exports.updateWalletAddress = async (req, res) => {
  const { id } = req.params;
  const { wallet_address, id_user_type } = req.body;
  let userdata = null;

  try {
    await db.query(`
      UPDATE users SET wallet_address = "${wallet_address}" WHERE id = ${id};
    `);

    if (id_user_type == ID_OF_USER_TYPE_COMPANY) {
      userdata = (await db.query(`
        SELECT 
          companies.id AS id_company,
          companies.name AS company_name,
          companies.bio,
          companies.site_url,
          companies.country,
          companies.state,
          companies.city,
          companies.postal_code,
          companies.address,
          companies.id_user,
          companies.phone,
          companies.phone_verified,
          companies.date_of_birth,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM companies 
        LEFT JOIN users ON companies.id_user = users.id
        WHERE users.id = ${id};
      `))[0];
      jwt.sign(
        { ...userdata },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          console.log('# token => ', token);
          return res.status(200).send(token);
        });
    } else {
      userdata = (await db.query(`
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
          individuals.phone_verified,
          individuals.id_user,
          users.email,
          users.google_id,
          users.email_verified,
          users.avatar,
          users.wallet_address,
          users.id_user_type
        FROM individuals 
        LEFT JOIN users ON individuals.id_user = users.id
        WHERE users.id = ${id};
      `))[0];
      jwt.sign(
        { ...userdata },
        config.get('jwtSecret'),
        { expiresIn: '5 days' },
        (error, token) => {
          if (error) {
            console.log('# error => ', error);
            return res.status(500).send(MESSAGE_SERVER_ERROR);
          }
          console.log('# token => ', token);
          return res.status(200).send(token);
        });
    }
  } catch (error) {
    console.log('>>>>>>>> error of updateWalletAddress => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};