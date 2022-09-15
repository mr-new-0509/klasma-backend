exports.createPost = (req, res) => {
  const { created_by } = req.body;

  /* ------------- Handle created_by -------------- */
  let sqlOfFields = `(created_by, `;
  let sqlOfValues = `(${created_by}, `;
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

  db.query(`
    INSERT INTO posts ${sqlOfFields} VALUES ${sqlOfValues};
  `);
};