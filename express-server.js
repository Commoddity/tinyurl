const express = require("express");
const methodOverride = require('method-override');
const bodyParser = require("body-parser");
const cookieParser = require('cookie-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const { emailLookupHelper, loginHelper, urlsForUser, generateShortURL, generateRandomID, generateTimestamp } = require('./helpers.js');

const PORT = 8080;
const app = express();

app.set("view engine", "ejs");

app.use(methodOverride('_method'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(cookieSession({
  name: 'session',
  keys: ["the", "legend", "of", "zelda", "changed", "my", "life"],
  maxAge: 24 * 60 * 60 * 1000
}));

// DATABASE OBJECTS
const urlDatabase = {};
const usersDatabase = {};

// GET REQUESTS
app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  const userID = req.session.userID;
  const userURLs = urlsForUser(userID, urlDatabase);
  let templateVars = {
    user: usersDatabase[userID],
    urls: userURLs
  };
  res.render("urls-index", templateVars);
});

app.get("/urls/new", (req,res) => {
  const userID = req.session.userID;
  let templateVars = {
    user: usersDatabase[userID],
    urls: urlDatabase
  };
  if (req.session.userID) {
    res.render("urls-new", templateVars);
  } else {
    res.redirect("/urls/login");
  }
});

app.get("/urls/register", (req, res) => {
  const userID = req.session.userID;
  let templateVars = {
    user: usersDatabase[userID],
    urls: urlDatabase
  };
  if (req.session.userID in usersDatabase) {
    res.redirect("/urls");
  } else {
    res.render("urls-register", templateVars);
  }
});


app.get("/urls/login", (req, res) => {
  const userID = req.session.userID;
  let templateVars = {
    user: usersDatabase[userID],
    urls: urlDatabase
  };
  if (req.session.userID in usersDatabase) {
    res.redirect("/urls");
  } else {
    res.render("urls-login", templateVars);
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userID = req.session.userID;
  const userURLs = urlsForUser(userID, urlDatabase);
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404).send('This TinyURL does not exist');
  }
  let templateVars = {
    user: usersDatabase[userID],
    urls: urlDatabase,
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    pageViews: urlDatabase[req.params.shortURL].pageViews,
    uniquePageViews: urlDatabase[req.params.shortURL].uniquePageViews,
    timestamps: urlDatabase[req.params.shortURL].timestamps,
    visitors: urlDatabase[req.params.shortURL].visitors
  };
  if (userURLs[req.params.shortURL]) {
    res.render("urls-show", templateVars);
  } else {
    res.status(403).send('You do not have access to this TinyURL.');
  }
});

app.get("/u/:shortURL", (req, res) => {
  let visitorID = generateRandomID();
  const date = generateTimestamp();
  if (!req.cookies.visitorID) {
    res.cookie('visitorID', visitorID);
  } else {
    visitorID = req.cookies.visitorID;
  }
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404).send('This TinyURL does not exist');
  } else {
    urlDatabase[req.params.shortURL].pageViews += 1;
    if (!(urlDatabase[req.params.shortURL].visitors.includes(visitorID)) && !(urlDatabase[req.params.shortURL].userVisitors.includes(req.session.userID))) {
      urlDatabase[req.params.shortURL].uniquePageViews += 1;
    }
    urlDatabase[req.params.shortURL].timestamps.push(date);
    if (req.cookies.visitorID) {
      urlDatabase[req.params.shortURL].visitors.push(req.cookies.visitorID);
    } else {
      urlDatabase[req.params.shortURL].visitors.push(generateRandomID());
    }
    if (req.session.userID && !(urlDatabase[req.params.shortURL].userVisitors.includes(req.session.userID))) {
      urlDatabase[req.params.shortURL].userVisitors.push(req.session.userID);
    }
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  }
});

// POST REQUESTS
app.post("/urls", (req, res) => {
  const shortURL = generateShortURL();
  const dateCreated = generateTimestamp();
  urlDatabase[shortURL] = {};
  urlDatabase[shortURL].longURL = req.body.longURL;
  urlDatabase[shortURL].userID = req.session.userID;
  urlDatabase[shortURL].dateCreated = dateCreated;
  urlDatabase[shortURL].pageViews = 0;
  urlDatabase[shortURL].uniquePageViews = 0;
  urlDatabase[shortURL].timestamps = [];
  urlDatabase[shortURL].visitors = [];
  urlDatabase[shortURL].userVisitors = [];
  res.redirect(`./urls/${shortURL}`);
});

app.post("/register", (req, res) => {
  const userID = generateRandomID();
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  usersDatabase[userID] = {};
  usersDatabase[userID].id = userID;
  if (req.body.email.length === 0 || req.body.password.length === 0) {
    res.status(400).send('Must enter value into field.');
  } else if (emailLookupHelper(req.body.email, usersDatabase)) {
    res.status(400).send('User account with that email already exists.');
  } else {
    usersDatabase[userID].email = req.body.email;
    usersDatabase[userID].password = hashedPassword;
    req.session.userID = userID;
    res.redirect("/urls");
  }
});

app.post("/login", (req, res) => {
  if (emailLookupHelper(req.body.email, usersDatabase)) {
    const requestPassword = req.body.password;
    let userID;
    if (requestPassword) {
      userID = loginHelper(req.body.email, requestPassword, usersDatabase);
    } else {
      res.status(403).send('Incorrect password for that user account.');
    }
    if (userID) {
      req.session.userID = userID;
      res.redirect("/urls");
    } else {
      res.status(403).send('Incorrect password for that user account.');
    }
  } else {
    res.status(403).send('No user account with that email address.');
  }
});

app.post("/logout", (req,res) => {
  req.session = null;
  res.clearCookie('visitorID');
  res.redirect("/urls");
});

app.put("/urls/:shortURL", (req, res) => {
  const userID = req.session.userID;
  const userURLs = urlsForUser(userID, urlDatabase);
  if (userURLs[req.params.shortURL]) {
    urlDatabase[req.params.shortURL].longURL = req.body.updateURL;
    res.redirect("/urls");
  } else {
    res.status(403).send('You do not have access to this TinyURL.');
  }
});

app.delete("/urls/:shortURL", (req, res) => {
  const userID = req.session.userID;
  const userURLs = urlsForUser(userID, urlDatabase);
  if (userURLs[req.params.shortURL]) {
    delete urlDatabase[req.params.shortURL];
    res.redirect("/urls");
  } else {
    res.status(403).send('You do not have access to this TinyURL.');
  }
});

// LISTENERS
app.listen(PORT, () => {
  console.log(`TinyApp Server running!\nTinyApp listening on port ${PORT}!`);
});
