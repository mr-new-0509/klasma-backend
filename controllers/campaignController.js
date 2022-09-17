const {
  ID_OF_STATUS_APPROVED,
  MESSAGE_SERVER_ERROR,
  INIT_RAISED_PRICE,
  ID_OF_STATUS_COMPLETED,
  MESSAGE_INVEST_FINISHED,
  ID_OF_USER_TYPE_COMPANY,
} = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime, convertTZ, getDateTimeString } = require("../utils/functions");

/** Create a new campaign */
exports.createCampaign = async (req, res) => {
  const { goal_price, id_company, faqs, close_at } = req.body;
  const currentDateTime = getCurrentDateTime();
  let sqlOfFields = '(';
  let sqlOfValues = '(';
  let _faqs = [];

  /* ----------------- Calculate close at ------------------ */
  let serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let convertedCloseAt = convertTZ(close_at, serverTimezone);
  let closeAt = getDateTimeString(convertedCloseAt);
  /* ------------------------------------------------------- */

  /* ------------- Remove faqs -------------- */
  if (faqs.length > 0) {
    _faqs = [...req.body.faqs];
  }
  delete req.body.faqs;
  /* --------------------------------------- */

  /* ------------- Handle goal_price, id_company, close_at ------------ */
  sqlOfFields += 'goal_price, id_company, id_status, created_at, raised_price, close_at, ';
  sqlOfValues += `${goal_price}, ${id_company}, ${ID_OF_STATUS_APPROVED}, "${currentDateTime}", ${INIT_RAISED_PRICE}, "${closeAt}", `;
  delete req.body.goal_price;
  delete req.body.id_company;
  delete req.body.close_at;
  /* ------------------------------------------------------------------- */

  /* ----------------- Create a new campaign ------------------- */
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

  const createdCampaign = await db.query(`
    INSERT INTO campaigns${sqlOfFields} VALUES ${sqlOfValues};
  `);
  /* ----------------------------------------------------------- */

  /* --------------------- Create new faqs --------------------- */
  if (_faqs.length > 0) {
    let sqlOfFaqValues = '';
    for (let i = 0; i < _faqs.length; i += 1) {
      if (i === _faqs.length - 1) {
        sqlOfFaqValues += `(
          "${String(_faqs[i].question).replace(/"/g, '\'\'')}", 
          "${String(_faqs[i].answer).replace(/"/g, '\'\'')}", 
          ${ID_OF_STATUS_APPROVED},
          ${createdCampaign.insertId},
          "${currentDateTime}"
        )`;
      } else {
        sqlOfFaqValues += `(
          "${String(_faqs[i].question).replace(/"/g, '\'\'')}", 
          "${String(_faqs[i].answer).replace(/"/g, '\'\'')}", 
          ${ID_OF_STATUS_APPROVED},
          ${createdCampaign.insertId},
          "${currentDateTime}"
        ), `;
      }
    }
    await db.query(`
      INSERT INTO faqs(question, answer, id_status, id_campaign, created_at) VALUES${sqlOfFaqValues};
    `);
  }
  /* ----------------------------------------------------------- */

  return res.status(201).send('');
};

/** Get campaigns of a company */
exports.getCampaignsByCompanyId = (req, res) => {
  const { id } = req.params;
  db.query(`
    SELECT * FROM campaigns WHERE id_company = ${id};
  `)
    .then(results => res.status(200).send(results))
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};

/** Get a campaign by its id */
exports.getCampaignById = async (req, res) => {
  const { id } = req.params;
  try {
    /* ------------ Get a campaign ------------- */
    let campaign = (await db.query(`
      SELECT campaigns.*, companies.name AS company_name FROM campaigns 
      LEFT JOIN companies ON companies.id = campaigns.id_company
      WHERE campaigns.id = ${id};
    `))[0];

    let faqs = await db.query(`
      SELECT * FROM faqs WHERE id_campaign = ${id} AND id_status = ${ID_OF_STATUS_APPROVED};
    `);
    campaign.faqs = faqs;

    if (campaign.medias) {
      campaign.medias = campaign.medias.split(',');
    } else {
      campaign.medias = [];
    }
    /* ----------------------------------------- */

    /* ----------- Get investments of the campaign ------------ */
    const investments = await db.query(`
      SELECT
        investments.id,
        investments.id_user,
        investments.price,
        investments.transaction_id,
        investments.created_at,
        investments.updated_at,
        users.email
      FROM investments 
      LEFT JOIN users ON investments.id_user = users.id
    `);
    /* -------------------------------------------------------- */

    //  Get comments of campaign
    const commentsOfCampaign = await db.query(`
      SELECT campaign_comments.*, uni.name AS creator_name, uni.avatar AS creator_avatar
      FROM campaign_comments
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
      ) AS uni ON campaign_comments.created_by = uni.id_user
      WHERE campaign_comments.id_campaign = ${id};
    `);

    return res.status(200).send({ campaign, investments, commentsOfCampaign });
  } catch (error) {
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Update a campaign */
exports.updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { goal_price, faqs, close_at } = req.body;
  const currentDateTime = getCurrentDateTime();
  let _faqs = [];
  let sqlParseOfUpdate = '';

  /* ----------------- Calculate close at ------------------ */
  let serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let convertedCloseAt = convertTZ(close_at, serverTimezone);
  let closeAt = getDateTimeString(convertedCloseAt);
  /* ------------------------------------------------------- */

  /* ------------- Remove faqs -------------- */
  if (faqs.length > 0) {
    _faqs = [...req.body.faqs];
  }
  delete req.body.faqs;
  /* --------------------------------------- */

  /* ------------ Handle goal_price and id_company --------- */
  delete req.body.id_company;

  sqlParseOfUpdate += `goal_price = ${goal_price}, updated_at = "${currentDateTime}", close_at = "${closeAt}", `;

  delete req.body.goal_price;
  delete req.body.close_at;
  /* ------------------------------------------------------- */

  /* --------------- Update a compaign -------------- */
  const fields = Object.keys(req.body);

  fields.forEach((field, index) => {
    if (index == fields.length - 1) {
      sqlParseOfUpdate += `${field} = "${String(req.body[field]).replace(/"/g, '\'\'')}"`;
    } else {
      sqlParseOfUpdate += `${field} = "${String(req.body[field]).replace(/"/g, '\'\'')}", `;
    }
  });

  await db.query(`UPDATE campaigns SET ${sqlParseOfUpdate} WHERE id = ${id};`);
  /* ------------------------------------------------ */

  /* ----------------- Handle Faqs ------------------ */
  //  Delete old faqs
  await db.query(`DELETE FROM faqs WHERE id_campaign = ${id};`);

  //  Insert new faqs
  if (_faqs.length > 0) {
    let sqlOfFaqValues = '';
    for (let i = 0; i < _faqs.length; i += 1) {
      if (i === _faqs.length - 1) {
        sqlOfFaqValues += `(
          "${String(_faqs[i].question).replace(/"/g, '\'\'')}", 
          "${String(_faqs[i].answer).replace(/"/g, '\'\'')}", 
          ${ID_OF_STATUS_APPROVED},
          ${id},
          "${currentDateTime}"
        )`;
      } else {
        sqlOfFaqValues += `(
          "${String(_faqs[i].question).replace(/"/g, '\'\'')}", 
          "${String(_faqs[i].answer).replace(/"/g, '\'\'')}", 
          ${ID_OF_STATUS_APPROVED},
          ${id},
          "${currentDateTime}"
        ), `;
      }
    }
    await db.query(`
      INSERT INTO faqs(question, answer, id_status, id_campaign, created_at) VALUES${sqlOfFaqValues};
    `);
  }
  /* ------------------------------------------------ */
  return res.status(200).send('');
};

/** Get all campaigns */
exports.getAllCampaigns = async (req, res) => {
  db.query(`SELECT * FROM campaigns;`)
    .then(results => res.status(200).send(results))
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};

/** Invest to a campaign */
exports.invest = async (req, res) => {
  try {
    const { id_user, price, fee, id_campaign, transaction_id } = req.body;

    const campaign = (await db.query(`
      SELECT * FROM campaigns 
      WHERE id = ${id_campaign} 
      AND id_status = ${ID_OF_STATUS_APPROVED};
    `))[0];

    if (campaign) {
      const currentDateTime = getCurrentDateTime();

      // Create a new investment
      const newInvestment = await db.query(`
        INSERT INTO investments (
          id_user, 
          price, 
          id_campaign, 
          transaction_id, 
          created_at
        ) VALUES (
          ${id_user}, 
          ${price}, 
          ${id_campaign}, 
          "${transaction_id}", 
          "${currentDateTime}"
        );
      `);

      //  Create a fee
      await db.query(`
        INSERT INTO investment_fees (id_investment, fee) 
        VALUES (${newInvestment.insertId}, ${fee});
      `);

      /* -------------------- Update the campaign --------------------- */
      const updatedRaisedPrice = campaign.raised_price + price;

      //  Update the raised price.
      let toUpdateFieldsOfCampaigns = `raised_price = ${updatedRaisedPrice}`;

      //  If the raised price is reached or over the goal one, update the status of campaign.
      if (updatedRaisedPrice >= campaign.goal_price) {
        toUpdateFieldsOfCampaigns += `, id_status = ${ID_OF_STATUS_COMPLETED}`;
      }

      await db.query(`
        UPDATE campaigns SET ${toUpdateFieldsOfCampaigns} WHERE id = ${id_campaign}
      `);
      /* --------------------------------------------------------------- */

      return res.status(201).send('');
    }
    return res.status(500).send(MESSAGE_INVEST_FINISHED);
  } catch (error) {
    console.log('>>>>>>>> error of invest => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Check whether investment into the campaign is available or not */
exports.checkIsInvestmentAvailable = (req, res) => {
  const { campaignId } = req.params;
  console.log('>>>>>>>>> campaignId => ', campaignId);
  db.query(`
    SELECT * FROM campaigns WHERE id = ${campaignId} AND id_status = ${ID_OF_STATUS_APPROVED};
  `)
    .then(results => {
      console.log('>>>>> results => ', results);
      if (results.length > 0) {
        return res.status(200).send(true);
      }
      return res.status(200).send(false);
    })
    .catch(error => {
      console.log('>>>>>>>> error of checkIsInvestmentAvailable => ', error);
      return res.status(500).send(MESSAGE_SERVER_ERROR);
    });
};

/** Close a campaign */
exports.updateCampaignStatus = (req, res) => {
  const { id } = req.params;
  const { id_status } = req.body;
  const currentDateTime = getCurrentDateTime();
  db.query(`
    UPDATE campaigns 
    SET id_status = ${id_status}, updated_at = "${currentDateTime}" 
    WHERE id = ${id};
  `)
    .then(response => res.status(200).send(''))
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};

/** Create a comment of campaign */
exports.createCommentOfCampaign = (req, res) => {
  const { content, id_campaign, created_by } = req.body;
  const currentDateTime = getCurrentDateTime();

  db.query(`
    INSERT INTO campaign_comments (content, id_campaign, id_status, created_by, created_at)
    VALUES (
      "${String(content).replace(/"/g, '\'\'')}", 
      ${id_campaign},
      ${ID_OF_STATUS_APPROVED},
      ${created_by},
      "${currentDateTime}"
    );
  `).then(async (result) => {
    const resData = {
      id: result.insertId,
      content,
      id_campaign,
      id_status: ID_OF_STATUS_APPROVED,
      created_by,
      created_at: currentDateTime,
      updated_at: ''
    };
    const userData = (await db.query(`SELECT id_user_type, avatar FROM users WHERE id = ${created_by};`))[0];

    if (userData.id_user_type == ID_OF_USER_TYPE_COMPANY) {
      const { name } = (await db.query(`
        SELECT name FROM companies WHERE id_user = ${created_by};
      `))[0];

      resData.creator_name = name;
      resData.creator_image = userData.avatar;
    } else {
      const { first_name, last_name } = (await db.query(`
        SELECT first_name, last_name FROM individuals WHERE id_user = ${created_by};
      `))[0];

      resData.creator_name = `${first_name}, ${last_name}`;
      resData.creator_image = userData.avatar;
    }
    return res.status(201).send(resData);

  }).catch(error => {
    console.log('>>>>>>>>>>> error of createComment => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  });
};

/** Delete a comment of campaign */
exports.deleteCommentOfCampaign = (req, res) => {
  const { id } = req.params;
  db.query(`DELETE FROM campaign_comments WHERE id = ${id};`)
    .then(results => res.status(200).send())
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};
