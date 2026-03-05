const { admin, getUserFromToken } = require("../_lib");

function isValidRoom(room) {
  return typeof room === "string" && /^[A-Za-z0-9_-]{3,32}$/.test(room);
}

module.exports = { admin, getUserFromToken, isValidRoom };
