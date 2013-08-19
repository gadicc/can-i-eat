
// client (move to client only js?)

// generate table rows for all the different properties (vegan, etc)
templateProps = function() {
  var prop, propObj, out = '';
  for (var i = 0; i < props.length; i++) {
    prop = props[i];
    propObj = this.props && this.props[prop] ? this.props[prop] : {};
    console.log(prop);
    out += '<tr data-prop="'+ prop +'"><td>' + prop.substr(0,1).toUpperCase() + prop.substr(1) + ':</td><td>'
      + '<span class="prop" data-type="select2" data-value="' + propObj.status + '" data-id="status"></span>'
      + ' { Note: <span class="prop" data-id="note" data-value="' + propObj.note + '"></span>,'
      + ' Source: <span class="prop" data-id="source" data-value="' + propObj.source + '"></span> }<td></tr>\n';
  }
  return new Handlebars.SafeString(out);
}

templatePropsTrans = function() {
  var prop, propObj, out = '', destLang = Session.get('destLang');
  for (var i = 0; i < props.length; i++) {
    prop = props[i];
    propObj = this.props && this.props[prop] ? this.props[prop] : {};

    if (!propObj.status) continue;
    out += '<tr data-prop="'+ prop +'"><td>' + prop.substr(0,1).toUpperCase() + prop.substr(1) + ':</td><td>'
      + '<b>' + propObj.status + '</b>'
      + ' { Note: <span class="prop" data-id="note" data-value="'
        + getLang(this, 'props.'+prop+'.note', destLang, true) + '"></span>,'
      + ' Source: <span class="prop" data-id="source" data-value="'
        + getLang(this, 'props.'+prop+'.source', destLang, true) + '"></span> }<td></tr>\n';
  }
  return new Handlebars.SafeString(out);
}