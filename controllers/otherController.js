/** Get timezone of server  Ex: "Asia/Tokyo" */
exports.getServerTimezone = (req, res) => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return res.status(200).send(timezone);
};