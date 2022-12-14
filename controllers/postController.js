const {
  MESSAGE_SERVER_ERROR,
  ID_OF_STATUS_APPROVED,
  ID_OF_USER_TYPE_INDIVIDUAL,
  ID_OF_USER_TYPE_COMPANY
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
      //  Get favorites
      const favoritesOfPost = await db.query(`
        SELECT * FROM post_favorites WHERE id_post = ${post.id};
      `);

      const commentsOfPost = await db.query(`
        SELECT post_comments.*, uni.name AS creator_name, uni.avatar AS creator_avatar
        FROM post_comments
        LEFT JOIN (
          SELECT 
            users.id AS id_user,
            users.avatar,
            IF(
              users.id_user_type = 1, 
              companies.name, 
              CONCAT(individuals.first_name, " ", individuals.last_name)
            ) AS "name"
          FROM users
          LEFT JOIN companies ON users.id = companies.id_user
          LEFT JOIN individuals ON users.id = individuals.id_user
        ) AS uni ON post_comments.created_by = uni.id_user
        WHERE post_comments.id_post = ${post.id};
      `);

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
        SELECT email, id_user_type, avatar FROM users WHERE id = ${post.created_by};
      `))[0];

      if (user.id_user_type === ID_OF_USER_TYPE_INDIVIDUAL) {
        //  If the creator is individual

        const individual = (await db.query(`
          SELECT id AS id_individual, first_name, last_name
          FROM individuals WHERE id_user = ${post.created_by};
        `))[0];
        const creatorOfPost = {
          avatar: user.avatar,
          name: `${individual.first_name} ${individual.last_name}`
        };

        return res.status(200).send({ post, creatorOfPost, favoritesOfPost, commentsOfPost });
      } else {
        //  If the creator is a company

        const company = (await db.query(`
          SELECT id AS id_company, name
          FROM companies WHERE id_user = ${post.created_by};
        `))[0];
        const creatorOfPost = {
          avatar: user.avatar,
          name: company.name
        };
        return res.status(200).send({ post, creatorOfPost, favoritesOfPost, commentsOfPost });
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
exports.getPostsByUserId = async (req, res) => {
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

/** Get all posts */
exports.getAllPosts = (req, res) => {
  db.query(`
    SELECT posts.*, COUNT(post_favorites.id_post) AS number_of_favorites
    FROM posts
    LEFT JOIN post_favorites ON posts.id = post_favorites.id_post 
    GROUP BY posts.id;
  `).then(results => {
    return res.status(200).send(results);
  }).catch(error => {
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  });
};

/** Set or remove favorite a post */
exports.handlePostFavorites = async (req, res) => {
  const { id_user, id_post } = req.body;
  try {

    //  Check if the user is a creator of the post
    const post = (await db.query(`SELECT created_by FROM posts WHERE id = ${id_post};`))[0];

    if (post.created_by == id_user) {
      return res.status(403).send('');
    } else {

      //  Check whether the user already set favorite for the post
      const postFavorite = (await db.query(`
        SELECT * FROM post_favorites 
        WHERE id_user = ${id_user} AND id_post = ${id_post};
      `))[0];

      if (postFavorite) {

        //  If yes, delete it.
        await db.query(`DELETE FROM post_favorites WHERE id = ${postFavorite.id};`);
      } else {

        //  If no, add it.
        await db.query(`
          INSERT INTO post_favorites (id_user, id_post)
          VALUES (${id_user}, ${id_post});
        `);
      }

      //  Get the favorites of the post
      const postFavorites = (await db.query(`
        SELECT * FROM post_favorites WHERE id_post = ${id_post};
      `));
      return res.status(200).send(postFavorites);
    }
  } catch (error) {
    console.log('>>>>>>>>>> error of handlePostFavorites => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Create a comment of post */
exports.createCommentOfPost = (req, res) => {
  const { content, id_post, created_by } = req.body;
  const currentDateTime = getCurrentDateTime();

  db.query(`
    INSERT INTO post_comments (content, id_post, id_status, created_by, created_at)
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
    const userData = (await db.query(`
      SELECT id_user_type, avatar FROM users WHERE id = ${created_by};
    `))[0];

    if (userData.id_user_type == ID_OF_USER_TYPE_COMPANY) {
      const { name } = (await db.query(`
        SELECT name FROM companies WHERE id_user = ${created_by};
      `))[0];

      resData.creator_name = name;
      resData.creator_avatar = userData.avatar;
    } else {
      const { first_name, last_name } = (await db.query(`
        SELECT first_name, last_name FROM individuals WHERE id_user = ${created_by};
      `))[0];

      resData.creator_name = `${first_name}, ${last_name}`;
      resData.creator_avatar = userData.avatar;
    }
    return res.status(201).send(resData);

  }).catch(error => {
    console.log('>>>>>>>>>>> error of createComment => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  });
};

/** Delete a comment of post */
exports.deleteCommentOfPost = (req, res) => {
  const { id } = req.params;
  db.query(`DELETE FROM post_comments WHERE id = ${id};`)
    .then(results => res.status(200).send())
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};