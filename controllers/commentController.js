const {
  ID_OF_STATUS_APPROVED,
  MESSAGE_SERVER_ERROR,
  ID_OF_USER_TYPE_COMPANY
} = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime } = require("../utils/functions");

/** Create a comment */
exports.create = (req, res) => {
  const { content, id_post, created_by } = req.body;
  const currentDateTime = getCurrentDateTime();

  db.query(`
    INSERT INTO comments (content, id_post, id_status, created_by, created_at)
    VALUES (
      "${String(content).replace(/"/g, '\'\'')}", 
      ${id_post},
      ${ID_OF_STATUS_APPROVED},
      ${created_by},
      "${currentDateTime}"
    );
  `).then(async (result) => {
    const resData = {
      id: result.insertId,
      content,
      id_post,
      id_status: ID_OF_STATUS_APPROVED,
      created_by,
      created_at: currentDateTime,
      updated_at: ''
    };
    const userData = (await db.query(`SELECT id_user_type FROM users WHERE id = ${created_by};`))[0];

    if (userData?.id_user_type == ID_OF_USER_TYPE_COMPANY) {
      const { name, logo } = (await db.query(`
        SELECT name, logo FROM companies WHERE id_user = ${created_by};
      `));

      resData.creator_name = name;
      resData.creator_image = logo;
    } else {
      const { first_name, last_name, avatar } = (await db.query(`
        SELECT first_name, last_name, avatar FROM individuals WHERE id_user = ${created_by};
      `))[0];

      resData.creator_name = `${first_name}, ${last_name}`;
      resData.creator_image = avatar;
    }
    return res.status(201).send(resData);
  }).catch(error => {
    console.log('>>>>>>>>>>> error of createComment => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  });
};