const { ID_OF_STATUS_APPROVED } = require("../utils/constants");
const db = require("../utils/db");

exports.createCampaign = async (req, res) => {
  const { goal_price, id_company, faqs } = req.body;
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
  sqlOfFields += 'goal_price, id_company, id_status, ';
  sqlOfValues += `${goal_price}, ${id_company}, ${ID_OF_STATUS_APPROVED}, `;
  delete req.body.goal_price;
  delete req.body.id_company;
  /* ----------------------------------------------------------- */

  /* ----------------- Create a new campaign ------------------- */
  const fields = Object.keys(req.body);

  fields.forEach((field, index) => {
    if (index == fields.length - 1) {
      sqlOfFields += `${field})`;
      sqlOfValues += `'${req.body[field]}')`;
    } else {
      sqlOfFields += `${field}, `;
      sqlOfValues += `'${req.body[field]}', `;
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
          '${_faqs[i].question}', 
          '${_faqs[i].answer}', 
          ${ID_OF_STATUS_APPROVED},
          ${createdCampaign.insertId}
        )`;
      } else {
        sqlOfFaqValues += `(
          '${_faqs[i].question}', 
          '${_faqs[i].answer}', 
          ${ID_OF_STATUS_APPROVED},
          ${createdCampaign.insertId}
        ), `;
      }
    }
    await db.query(`
      INSERT INTO faqs(question, answer, id_status, id_campaign) VALUES${sqlOfFaqValues};
    `);
  }
  /* ----------------------------------------------------------- */

  const campaigns = await db.query(`SELECT * FROM campaigns`);

  return res.status(201).send(campaigns);
};