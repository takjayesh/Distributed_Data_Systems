const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");
const ValidationService = require('./ValidationService');

class ValidationServiceImpl extends ValidationService {

  validateJson(json, schemaPath) {
    let parsedJson;
    try {
      parsedJson = JSON.parse(json);
      console.log("Parsed Json:", parsedJson);
    } catch (e) {
      throw new Error("Failed to parse the body into json");
    }

    const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '..', schemaPath), "utf8"));

    const ajv = new Ajv({
      schemaId: 'auto',
      meta: require('ajv/lib/refs/json-schema-draft-04.json'),
      extendRefs: true,
      unknownFormats: 'ignore'
    });
    // ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    console.log(schema);
    const validate = ajv.compile(schema);
    console.log(validate);
    const valid = validate(parsedJson);
    console.log("validate json", valid);
    if (!valid) {
      const errors = validate.errors.map((err) => err.message);
      const error = new Error("Validation error - Error compiling schema.");
      error.details = errors;
      throw error;
    }

    return {parsedJson, valid};
  }
}

module.exports = ValidationServiceImpl;
