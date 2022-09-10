const { ID_OF_STATUS_APPROVED, MESSAGE_SERVER_ERROR, INIT_RAISED_PRICE } = require("../utils/constants");
const db = require("../utils/db");
const { getCurrentDateTime } = require("../utils/functions");

/** Create a new campaign */
exports.createCampaign = async (req, res) => {
  const { goal_price, id_company, faqs } = req.body;
  const currentDateTime = getCurrentDateTime();
  let sqlOfFields = '(';
  let sqlOfValues = '(';
  let _faqs = [];

  /* ------------- Remove faqs -------------- */
  if (faqs.length > 0) {
    _faqs = [...req.body.faqs];
  }
  delete req.body.faqs;
  /* --------------------------------------- */

  /* ------------- Handle goal_price and id_company ------------ */
  sqlOfFields += 'goal_price, id_company, id_status, created_at, raised_price, ';
  sqlOfValues += `${goal_price}, ${id_company}, ${ID_OF_STATUS_APPROVED}, "${currentDateTime}", ${INIT_RAISED_PRICE}, `;
  delete req.body.goal_price;
  delete req.body.id_company;
  /* ----------------------------------------------------------- */

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
    SELECT * FROM campaigns WHERE id_company = ${id} AND id_status = ${ID_OF_STATUS_APPROVED}
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
      SELECT * FROM campaigns WHERE id = ${id} AND id_status = ${ID_OF_STATUS_APPROVED};
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
        investments.created_at,
        investments.updated_at,
        users.email
      FROM investments 
      LEFT JOIN users ON investments.id_user = users.id
    `);
    /* -------------------------------------------------------- */
    return res.status(200).send({ campaign, investments });
  } catch (error) {
    console.log('>>>>> error => ', error);
    return res.status(500).send(MESSAGE_SERVER_ERROR);
  }
};

/** Update a campaign */
exports.updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { goal_price, faqs } = req.body;
  const currentDateTime = getCurrentDateTime();
  let _faqs = [];
  let sqlParseOfUpdate = '';

  /* ------------- Remove faqs -------------- */
  if (faqs.length > 0) {
    _faqs = [...req.body.faqs];
  }
  delete req.body.faqs;
  /* --------------------------------------- */

  /* ------------ Handle goal_price and id_company --------- */
  delete req.body.id_company;

  sqlParseOfUpdate += `goal_price = ${goal_price}, updated_at = "${currentDateTime}", `;

  delete req.body.goal_price;
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