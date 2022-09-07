const { ID_OF_STATUS_APPROVED, MESSAGE_SERVER_ERROR } = require("../utils/constants");
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
  sqlOfFields += 'goal_price, id_company, id_status, created_at, ';
  sqlOfValues += `${goal_price}, ${id_company}, ${ID_OF_STATUS_APPROVED}, "${currentDateTime}", `;
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
  db.query(`SELECT * FROM campaigns WHERE id_company = ${id}`)
    .then(results => res.status(200).send(results))
    .catch(error => res.status(500).send(MESSAGE_SERVER_ERROR));
};