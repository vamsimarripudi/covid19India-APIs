const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");
const app = express();
app.use(express.json());

let database = null;

const initialziationDbServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`), process.exit(1);
  }
};
initialziationDbServer();

const convertDbServerToResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrictDbServerToResObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};
//API 1

app.get("/states/", async (req, res) => {
  const getStateQuery = `SELECT * FROM state`;
  const dbResponse = await database.all(getStateQuery);
  res.send(
    dbResponse.map((eachMovie) => {
      convertDbServerToResponseObject(eachMovie);
    })
  );
});

//API 2
app.get("/states/:stateId", async (req, res) => {
  const { stateId } = req.params;
  const getStateDetailsQuery = `
  SELECT * 
  FROM state 
  WHERE state_id=${stateId}`;
  const dbResponse = await database.get(getStateDetailsQuery);
  res.send(convertDbServerToResponseObject(dbResponse));
});

//API 3
app.post("/districts/", async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const addDistrictDetailsToDb = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
  VALUES(
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
  )`;
  const dbResponse = await database.run(addDistrictDetailsToDb);
  res.send("District Successfully Added");
});

//API 4
app.get("/districts/:districtId", async (req, res) => {
  const { districtId } = req.params;
  const getDistrictById = `
  SELECT * 
  FROM district 
  WHERE district_id=${districtId}`;
  const dbResponse = await database.get(getDistrictById);
  res.send(convertDistrictDbServerToResObject(dbResponse));
});

//API 5

app.delete("/districts/:districtId", async (req, res) => {
  const { districtId } = req.params;
  const deleteSelectedDist = `
  DELETE FROM district 
  WHERE district_id = ${districtId}`;
  await database.run(deleteSelectedDist);
  res.send("District Removed");
});

//API 6

app.put("/districts/:districtId/", async (req, res) => {
  const { districtName, stateId, cases, cured, active, deaths } = req.body;
  const { districtId } = req.body;
  const updatedDetailsOfDist = `
  UPDATE 
  district 
  SET
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}

  WHERE district_id=${districtId}
   `;
  await database.run(updatedDetailsOfDist);
  res.send("District Details Updated");
});

//API 7
app.get("/states/:stateId/stats/", async (req, res) => {
  const { stateId } = req.params;
  const getStateStatsQuery = `
  SELECT 
  SUM(cases),
  SUM(cured),
  SUM(active),
  SUM(deaths)

  FROM
  district
  WHERE
  state_id=${stateId}
  `;
  const stats = await database.get(getStateStatsQuery);
  console.log(stats);
  res.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//API 8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    `; //With this we will get the state_id using district table
  const getDistrictIdQueryResponse = await database.get(getDistrictIdQuery);

  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    `; //With this we will get state_name as stateName using the state_id
  const getStateNameQueryResponse = await database.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});
module.exports = app;
