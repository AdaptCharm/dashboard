/*
Creates a dashboard.
+ NOTE Requires using req.user.


Packages required:
+ express
+ @adaptcharm/render
+ glob

*/


/********************************************* SETUP FUNCTIONS **********************************************/


//Load required packages.
const express = require("express")
const render = require("@adaptcharm/render")
const glob = require("glob")


//Export primary function.
module.exports = Dashboard





/********************************************* PRIMARY FUNCTIONS **********************************************/


/*
The dashboard class.
*/
function Dashboard(options = {}) {
  if(!(this instanceof Dashboard)) { return new Dashboard(...arguments) }
  var app = express.Router(), dash = this
  dash.app = function() { return app }
  if(!options.signInFree) { options.signInFree = ["/sign-in", "/sign-up", "/forgot-password"] }


  /********************** API FUNCTIONS **********************/


  //Create an API router.
  var apiRouter = express.Router({caseSensitive: true, strict: true})
  app.use("/api", apiRouter)



  /*
  Creates a base API function.
  */
  apiRouter.use(async function(req, res, next) {
    try {
      //Make sure user is signed in.
      if((!req.user || !req.user.id || !req.headers["session"] || req.headers["session"] !== req.ssn.id) && !options.signInFree.includes(req.path)) {
        return res.status(401).json({error: "Please sign in", action: "redirect"})
      }

      //Handle CORS.
      res.set({
        "Access-Control-Allow-Origin": options.origin || "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS, HEAD",
        "Access-Control-Max-Age": 600,
        "Cache-Control": "no-cache, no-store"
      })
      if(!options.origin && req.headers.origin) { res.set({"Access-Control-Allow-Origin": req.headers.origin}) }

      //Kill any OPTIONS request here.
      if(req.method.toLowerCase() == "options") {
        return res.set({"Cache-Control": "max-age=600"}).status(200).end()
      }

      next()
    }
    catch (e) { next(e) }
  })



  /*
  Creates the customizable user-defined API.
  */
  dash.api = function(method, path, ...callback) {
    return apiRouter[(method || "get").toLowerCase()](path, ...callback)
  }
  dash.api.get = function() { return dash.api("get", ...arguments) }
  dash.api.post = function() { return dash.api("post", ...arguments) }
  dash.api.delete = function() { return dash.api("delete", ...arguments) }
  dash.api.put = function() { return dash.api("put", ...arguments) }





  /********************** LOGIN FUNCTIONS **********************/


  //Load & compile all pages & assets.
  var templates = render(options.pages, {skip: ["components"]})



  /*
  Display the sign in, sign up & forgot password pages.
  */
  if(options.signInFree && options.signInFree.length) {
    app.get(options.signInFree, async function(req, res, next) {
      try {
        if(req.user && req.user.id) { return res.redirect(req.baseUrl) }

        var page = templates.pages[req.path]
        if(!page || !page.content) { return next() }

        return await renderPage(page, req, res)
      }
      catch (e) { next(e) }
    })
  }



  /*
  Make sure user is signed in before any other operation.
  */
  app.use(async function(req, res, next) {
    try {
      if(!req.user || !req.user.id) { return res.redirect(302, req.baseUrl + "/sign-in") }
      next()
    }
    catch (e) { next(e) }
  })



  /*
  Serve dashboard HTML irrespective of page.
  */
  app.get("*", async function(req, res, next) {
    try {
      var page = templates.pages[req.path] || templates.pages["/"]
      return await renderPage(page, req, res)
    }
    catch (e) { next(e) }
  })



  /*
  Renders & sends a page.
  */
  var renderPage = async function(page, req, res) {
    var content = page.content

    //Render if needed.
    if(page.toRender) {
      var vars = {req, user: req.user, session: req.session}
      if(options.vars) { vars = Object.assign(vars, options.vars) }
      if(req.dash) { vars = Object.assign(vars, req.dash) }
      if(options.getVars) { vars = Object.assign(vars, await options.getVars(req, page)) }
      content = await content(vars)
    }

    res.status(200).set({"Content-Type": page.type, "Cache-Control": "max-age=" + (options.cache || 3600)}).send(content)
  }

}
