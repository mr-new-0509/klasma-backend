const {
  MESSAGE_SERVER_ERROR,
  ID_OF_STATUS_APPROVED,
  ID_OF_USER_TYPE_INDIVIDUAL
} = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime } = require("../utils/functions");

/** Create a post */
exports.createPost = (req, res) => {
  const { created_by } = req.body;
  const currentDateTime = getCurrentDateTime();

  /* ------------- Handle created_by -------------- */
  let sqlOfFields = `(created_by, id_status, created_at, `;
  let sqlOfValues = `(${created_by}, ${ID_OF_STATUS_APPROVED}, "${currentDateTime}", `;
  delete req.body.created_by;
  /* ----------------------------------------------- */

  /* ------------ Handle other fields -------------- */
  const fields = Object.keys(req.body);
  fields.forEach((field, index) => {
    if (index == fields.length - 1) {
      sqlOfFields += `${field})`;
      sqlOfValues += `"${String(req.body[field]).replace(/"/g, '\'\'')}")`;
    } else {
      sqlOfFields += `${field}, `;
      sqlOfValues += `"${String(req.body[field]).replace(/"/g, '\'\'')}", `;
    }
  });
  /* ----------------------------------------------- */

  //  Create a post
  db.query(`INSERT INTO posts ${sqlOfFields} VALUES ${sqlOfValues};`)
    .then(results => res.status(201).send(''))
    .catch(error => {
      console.log('>>>>>> error of createPost => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    });
};

/** Get a post by id */
exports.getPostById = async (req, res) => {
  const { id } = req.params;
  try {
    //  Get the post
    const post = (
      await db.query(`
        SELECT * FROM posts WHERE id = ${id} AND id_status = ${ID_OF_STATUS_APPROVED};
      `)
    )[0];

    if (post) {
      if (post.tags) {
        post.tags = post.tags.split(',');
      } else {
        post.tags = [];
      }

      if (post.medias) {
        post.medias = post.medias.split(',');
      } else {
        post.medias = [];
      }

      //  Get the user info of creator
      const user = (await db.query(`
        SELECT email, id_user_type FROM users WHERE id = ${post.created_by};
      `))[0];

      if (user?.id_user_type === ID_OF_USER_TYPE_INDIVIDUAL) {
        //  If the creator is individual

        const individual = (await db.query(`
          SELECT id AS id_individual, first_name, last_name, avatar
          FROM individuals WHERE id_user = ${post.created_by};
        `));
        const creatorOfPost = {
          email: user.email,
          ...individual
        };

        return res.status(200).send({ post, creatorOfPost });
      } else {
        //  If the creator is a company

        const company = (await db.query(`
          SELECT id AS id_company, name, logo
          FROM companies WHERE id_user = ${post.created_by};
        `));
        const creatorOfPost = {
          email: user.email,
          ...company
        };
        return res.status(200).send({ post, creatorOfPost });
      }
    } else {
      throw new Error();
    }
  } catch (error) {
    console.log('>>>>> error of getPostById => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Get a user's all posts */
exports.getPostsByUserId = (req, res) => {
  const { id } = req.params;
  db.query(`SELECT * FROM posts WHERE created_by = ${id} AND id_status = ${ID_OF_STATUS_APPROVED};`)
    .then(results => res.status(200).send(results))
    .catch(error => {
      console.log('>>>>>> error of getPostsByUserId => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    });
};

/** Update a post */
exports.updatePost = async (req, res) => {
  const { id } = req.params;
  try {
    const currentDateTime = getCurrentDateTime();
    let sqlOfSet = `updated_at = "${currentDateTime}", `;

    const fields = Object.keys(req.body);

    fields.forEach((field, index) => {
      if (index == fields.length - 1) {
        sqlOfSet += `${field} = "${String(req.body[field]).replace(/"/g, '\'\'')}"`;
      } else {
        sqlOfSet += `${field} = "${String(req.body[field]).replace(/"/g, '\'\'')}", `;
      }
    });

    await db.query(`UPDATE posts SET ${sqlOfSet} WHERE id = ${id};`);
    return res.status(200).send('');
  } catch (error) {
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};