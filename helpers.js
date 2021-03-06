const bcrypt = require('bcrypt');
const moment = require('moment');

// HELPER FUNCTIONS
const emailLookupHelper = (email, database) => {
  for (const userID in database) {
    if (database[userID].email === email) {
      return userID;
    }
  }
};

const loginHelper = (email, password, database) => {
  for (const userID in database) {
    const passwordCorrect = bcrypt.compareSync(password, database[userID].password);
    if (database[userID].email === email && passwordCorrect === true) {
      return userID;
    }
  }
};

const urlsForUser = (id, database) => {
  const filteredDatabase = {};
  for (const shortURL in database) {
    if (database[shortURL].userID === id) {
      filteredDatabase[shortURL] = database[shortURL];
    }
  }
  return filteredDatabase;
};

// RANDOM STRING GENERATOR FUNCTIONS
const generateShortURL = () => {
  const randomString = Math.random().toString(36).slice(-6);
  return randomString;
};

const generateRandomID = () => {
  const randomID = Math.random().toString(36).slice(-8);
  return randomID;
};

// DATE STRING GENERATOR AND PARSER
const generateTimestamp = () => {
  const date = moment().utcOffset('-0800').format('MMMM Do YYYY, h:mm:ss a');
  return date;
};

module.exports = { emailLookupHelper, loginHelper, urlsForUser, generateShortURL, generateRandomID, generateTimestamp };