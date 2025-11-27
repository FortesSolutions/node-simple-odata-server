function keys (o) {
  const res = [];
  const k = Object.keys(o);
  for (const i in k) {
    if (k[i].lastIndexOf('@', 0) === 0) {
      res.splice(0, 0, k[i]);
    } else {
      res.push(k[i]);
    }
  }
  return res;
}

function sortProperties (o) {
  const res = {};
  const props = keys(o);

  for (let i = 0; i < props.length; i++) {
    res[props[i]] = o[props[i]];
  }
  return res;
}

function removeOdataType (doc) {
  if (doc instanceof Array) {
    for (const i in doc) {
      if (typeof doc[i] === 'object' && doc[i] !== null) {
        removeOdataType(doc[i]);
      }
    }
  }

  delete doc['@odata.type'];

  for (const prop in doc) {
    if (typeof doc[prop] === 'object' && doc[prop] !== null) {
      removeOdataType(doc[prop]);
    }
  }
}

async function processBody (data, cfg, req, res) {
  try {
    removeOdataType(data);

    await cfg.base64ToBuffer(req.params.collection, data, req);

    const entity = await new Promise((resolve, reject) => {
      cfg.executeInsert(req.params.collection, data, req, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    res.statusCode = 201;
    res.setHeader('Content-Type', 'application/json;odata.metadata=minimal;odata.streaming=true;IEEE754Compatible=false;charset=utf-8');
    res.setHeader('OData-Version', '4.0');
    res.setHeader('Location', cfg.serviceUrl + '/' + req.params.collection + "/('" + encodeURI(entity._id) + "')");
    cfg.addCorsToResponse(res);

    await cfg.pruneResults(req.params.collection, entity, req);

    // odata.context must be first
    entity['@odata.id'] = cfg.serviceUrl + req.params.collection + "('" + entity._id + "')";
    entity['@odata.editLink'] = cfg.serviceUrl + req.params.collection + "('" + entity._id + "')";
    entity['@odata.context'] = cfg.serviceUrl + '$metadata#' + req.params.collection + '/$entity';

    const sortedEntity = sortProperties(entity);
    await cfg.bufferToBase64(req.params.collection, [sortedEntity], req);

    return res.end(JSON.stringify(sortedEntity));
  } catch (e) {
    return res.odataError(e);
  }
}

module.exports = function (cfg, req, res) {
  if (req.body) {
    return processBody(req.body, cfg, req, res);
  }

  let body = '';
  req.on('data', function (data) {
    body += data;
    if (body.length > 1e6) {
      req.connection.destroy();
    }
  });
  req.on('end', function () {
    return processBody(JSON.parse(body), cfg, req, res);
  });
};
