exports.getCurrentDateTime = () => {
  let currentMoment = new Date();
  let dd = String(currentMoment.getDate()).padStart(2, '0');
  let mm = String(currentMoment.getMonth() + 1).padStart(2, '0'); //January is 0!
  let yyyy = currentMoment.getFullYear();
  let hh = currentMoment.getHours();
  let min = currentMoment.getMinutes();
  let ss = currentMoment.getSeconds();

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

exports.getDateTimeString = (date) => {
  let dd = String(date.getDate()).padStart(2, '0');
  let mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
  let yyyy = date.getFullYear();
  let hh = date.getHours();
  let min = date.getMinutes();
  let ss = date.getSeconds();

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

exports.convertTZ = (date, tzString) => {
  return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
};