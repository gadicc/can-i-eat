/*
rules:
- ingredient
- company
- product

*/

function queryToRegExp(query) {
  if (query.match(/^\/(.*)\/$/))
    query = query.substr(1, query.length-2);
  else
    query = '(' + query + ')';
  return query;
}

// see if we added anything new
function select2check(ids, collection, select2data) {
  var doc;
  for (var i=0; i < ids.length; i++) {
    doc = collection.findOne(ids[i]);
    if (!doc) {
      doc = collection.findOne({name: ids[i]});
      if (doc) {
        ids[i] = doc._id;
      } else {
        id = collection.insert({name: ids[i], lang: Session.get('lang')});
        select2data.opts.data.push({ id: id, text: ids[i] });
        ids[i] = id;
      }
    }     
  }
  return ids;
}

// TODO, check where user input is used unescaped

if (Meteor.isClient) {

  Template.heading.browseName = function() {
    var id = Session.get('QUERY_BROWSE');
    var obj = Categories.findOne(id);
    return (obj && getLang(obj, 'name')) || '...';
  }

  Template.products.products = function() {
    var upc, search, browse;
    var query = {};
    var dep = Session.get('lang');

    upc = Session.get('QUERY_UPC');
    if (upc) {
      query.barcode = upc;
    } else {
      search = Session.get('QUERY_SEARCH');
      browse = Session.get('QUERY_BROWSE');
      if (search) {
        var obj = {};
        var langs = _.keys(MessageFormatCache.strings);
        for (var i=0; i < langs.length; i++)
          obj['trans.'+langs[i]+'.name'] = { $regex: queryToRegExp(search), $options: 'i' };
        query['$or'] = [ { name : { $regex: queryToRegExp(search), $options: 'i' } }, obj ];
      }
      if (browse) query.categories = browse;
    }
    return Products.find(query, { sort: { name: 1 }});
    var products = Products.find(query).fetch();
    LangM1.flattenCol(products);
    return products;
  }
  Template.products.log = function(text) { console.log(text); }

  Template.products.ready = function() {
    return _.all(allSubs, function(sub) {
      return sub.ready();
    });
  }

  Template.products.rendered = function() {
    var query = Session.get('QUERY_SEARCH');
    if (query && query.length > 0) {
      $('#productsDiv .name').each(function() {
        var $this = $(this), html;
        if ($this.data('highlighted'))
          return;
        $this.data('highlighted', $this.html());
        $this.html(
          $this.html().replace(new RegExp('('+query+')', 'i'), '<span class="highlight">$1</span>')
        );
      });
    }

    return;
    domSort('#productsDiv', function(a, b) {
      var c = $(a).find('span.name').html().toLowerCase(), d = $(b).find('span.name').html().toLowerCase();
      // http://stackoverflow.com/questions/2167602/optimum-way-to-compare-strings-in-javascript
      return c < d ? -1 : c > d ? 1 : 0;
    });
  }

  Handlebars.registerHelper('ts', function() {
    return new Date().getTime();
  });

  domSort = function(listEl, sortFunc) {
    var node, list, next, dupes = {}, id;
    var moves = 0;
    if (typeof listEl == 'string')
      listEl = $(listEl)[0];
    list = listEl.childNodes;

    // remove text nodes
    for (var i=0; i < list.length; i++)
      if (list[i].nodeType == 3)
        listEl.removeChild(list[i--])

    node = list[0]; next = list[1];
    while (next) {
      next = node.nextSibling;
      if (node.tagName == 'DIV')
      for (var n=node, n2=node.nextSibling; n2; n=n2, n2=n.nextSibling) {
        if (sortFunc(n2, n) < 0) {
          listEl.insertBefore(n2, n);
          moves++;
          break;
        }
      }
      node = next;
    }
    console.log('domSort in ' + moves + ' moves');
  }

  Template.browse.rendered = function() {
    var select = $('#browseSelect');
    if (select.data('select2')) {
      console.log('bug - constant region was rerendered');
      select.select2('destroy');
    }

    var browse = Session.get('QUERY_BROWSE');
    if (browse) {
      select.val(browse);
    } else {
      if (location.pathname.substr(0, 8) == '/browse/')
        var name = location.pathname.substr(8);
        var obj = Companies.findOne({name: name});
        if (obj) {
          select.val(obj._id);
        }
    }

    select.select2({
      query: function(query) { query.callback({results: allCategories}); },
      placeholder: mf('all_categories', null, 'All Categories'), allowClear: true,
      initSelection: function(element, callback) {
        var id = element.val();
        var obj = Categories.findOne(id);
        if (obj)
          callback({id: id, text: getLang(obj, 'name')});
      }
    }).on('change', function(e) {
      Meteor.Router.to(makePath({browse: e.val}));
    });
  };
  Deps.autorun(function() {
    // Change the browse placeholder "All Categories" when changing languages
    var el, oldPH, newPH, lang = Session.get('lang');
    var select2data = $('#browseSelect').data('select2');
    if (select2data) {
      oldPH = select2data.opts.placeholder;
      newPH = mf('all_categories', null, 'All Categories');
      select2data.opts.placeholder = newPH;

      // If nothing was selected, we need to manually udpate the existing placeholder span
      el = $('#browseWrap a.select2-choice > span');
      if (el.html() == oldPH)
        el.html(newPH);
      else {
        var select = $('#browseSelect');
        el.html(getLang(Categories.findOne(select.val()), 'name'));
      }
    }
  });

  Session.setDefault('showType', 'all');
  Template.showType.events({
    'click': function() {
      var type = Session.get('showType');
      if (type == 'all') type = 'yes';
      else if (type == 'yes') type = 'no';
      else type = 'all';
      $('#showType').attr('data-select', type);
      Session.set('showType', type);
    }
  });

  Template['edit-product'].props = templateProps;
  Template['edit-product-trans'].props = templatePropsTrans;

  Template.products.caneat = function() {
    var caneat = null;
    var excludes = [];

    // 1st priority: the product itself
    if (this.props) {
      for (var i=0; i < props.length; i++)
        if (this.props[props[i]] && this.props[props[i]].status) {
          excludes.push(props[i]);
          switch (this.props[props[i]].status) {
            case 'yes': if (caneat != 'no' || caneat != 'maybe') caneat='yes'; break;
            case 'maybe': if (caneat != 'no') caneat='maybe'; break;
            case 'no': caneat='no'; break;
          }
        }
    }

    // 2nd priority: the company

    // 3rd priority: ingredients
    var ingredient;
    if (this.ingredients)
    for (var j=0; j < this.ingredients.length; j++) {
      ingredient = new Ingredient(this.ingredients[j]);
      for (var i=0; i < props.length; i++) {
        if (excludes.indexOf(props[i]) != -1)
          continue;
        if (ingredient.props[props[i]])
        switch (ingredient.props[props[i]].status) {
          case 'yes': if (caneat != 'no' || caneat != 'maybe') caneat='yes'; break;
          case 'maybe': if (caneat != 'no') caneat='maybe'; break;
          case 'no': caneat='no'; break;
        }
      }
    }

    return caneat || 'yes';
  }
  Template.products.caneatMsg = function() {
    var caneat = null, out = [];
    var excludes = [];

    if (this.props)
    for (var i=0; i < props.length; i++)
      if (this.props[props[i]] && this.props[props[i]].status) {
        excludes.push(props[i]);
        switch (this.props[props[i]].status) {
          case 'yes':
            if (caneat != 'no' || caneat != 'maybe') {
              caneat='yes'; 
              out.push({
                note: getLang(this, 'props.'+props[i]+'.note'),
                source: getLang(this, 'props.'+props[i]+'.source')
              });
            }
            break;
          case 'maybe':
            if (caneat != 'no') {
              caneat='maybe';
              out.push({
                note: getLang(this, 'props.'+props[i]+'.note'),
                source: getLang(this, 'props.'+props[i]+'.source')
              });
            }
            break;
          case 'no':
            caneat='no';
            out.push({
              note: getLang(this, 'props.'+props[i]+'.note'),
              source: getLang(this, 'props.'+props[i]+'.source')
            });
            break;
        }
      }

    // 3rd priority: ingredients
    var ingredient, text;
    if (this.ingredients) {
      text = '';
      for (var j=0; j < this.ingredients.length; j++) {
        ingredient = new Ingredient(this.ingredients[j]);
        for (var i=0; i < props.length; i++) {
          if (excludes.indexOf(props[i]) != -1)
          continue;

          if (ingredient.props[props[i]])
          switch (ingredient.props[props[i]].status) {
            case 'yes':
              if (caneat != 'no' || caneat != 'maybe') {
                caneat='yes';
                out.push({
                  name: getLang(ingredient, 'name'),
                  note: getLang(ingredient, 'props.'+props[i]+'.note'),
                  source: getLang(ingredient, 'props.'+props[i]+'.source')
                });
              }
              break;
            case 'maybe':
              if (caneat != 'no') {
                caneat='maybe';
                out.push({
                  name: getLang(ingredient, 'name'),
                  note: getLang(ingredient, 'props.'+props[i]+'.note'),
                  source: getLang(ingredient, 'props.'+props[i]+'.source')
                });
              }
              break;
            case 'no':
              caneat='no';
                out.push({
                  name: getLang(ingredient, 'name'),
                  note: getLang(ingredient, 'props.'+props[i]+'.note'),
                  source: getLang(ingredient, 'props.'+props[i]+'.source')
                });
              break;
          }          
        }
      }
    }

//    console.log(out);
    return out;
  }

  Template.products.show = function(caneat) {
    var type = Session.get('showType');
    return (type == 'all' || caneat == type) ? '' : 'displayNone';
  };

  Template['add-product'].rendered = function() {
    console.log('add product rendered');
    var mTpl = Template['add-product'];
    var editableSuccessTpl = _.partial(editableSuccess, mTpl);
    mTpl.product = new Product(this._id);

    var el, select2s = {
      '#add-product-company': {
        collection: Companies,
        data: allCompanies, multiple: false, createSearchChoice: defaultCreateSearchChoice
      },
      '#add-product-ingredients': {
        collection: Ingredients,
        data: allIngredients, multiple: true, createSearchChoice: defaultCreateSearchChoice
      },
      '#add-product-categories': {
        collection: Categories,
        data: allCategories, multiple: true, createSearchChoice: defaultCreateSearchChoice
      }
    }
    for (elId in select2s) {
      el = $(elId);
      if (!el.prev().hasClass('select2-container')) {
        el.select2(select2s[elId]).on('change', (function(collection) {
          return function(event) {
            // check for new items, add them to database and replace value list
            var val = _.isArray(event.val) ? event.val : [event.val];
            val = select2check(val, collection, $(event.target).data('select2'));
            $(event.target).select2('val', val);
          }
        })(select2s[elId].collection));
      }
    }

    $('#modalStandard .btn-primary').click(function() {
      console.log(mTpl.product);
      mTpl.product.update({
        name: $('#add-product-name').val(),
        company: $('#add-product-company').val(),
        categories: $('#add-product-categories').val().split(','),
        barcode: $('#add-product-barcode').val(),
        ingredients: $('#add-product-ingredients').val().split(','),
        picURL: $('#add-product-picURL').val(),
        lang: Session.get('lang')
      });
      mTpl.product.save();
    });
  }

  function addProduct(event) {
    var mTpl = Template['add-product'];
    var editableSuccessTpl = _.partial(editableSuccess, mTpl);
    mTpl.product = new Product(this._id);

    modal({title: 'Add Product',
      body: function() { return new Handlebars.SafeString(mTpl()); } });
  }

  Template['community-header'].events({
    'click .add-product': addProduct
  });
  Template.actions.events({
    'click .add-product': addProduct
  });

  function defaultCreateSearchChoice(term, data) {
    if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
      return { id: term, text: term };
    }
  }

  function addDocSuccess(collection, ids, self, mTpl) {
    console.log('addDocSuccess');
    var name;
    var added = false;
    var source = $(self).data('editable').options.select2.data;
    if (!_.isArray(ids))
      ids = [ids];

    for (var i=0, id = ids[0]; i < ids.length; id = ids[++i]) {
      if (collection.find(id).count() == 0) {
        name = id; id = collection.insert({name: name, lang: Session.get('lang')});
        source.push({ id: id, text: name });
        added = true; ids[i] = id;
      }
    }

    editableSuccess(mTpl.product, null, ids, self);
    if (added) {
      console.log({ newValue: ids });
      return { newValue: ids };
    }
  }

  /* this is a workaround, see old way commented out below.  old way worked perfect in development but not
   * in deployment. */
  function select2display(ids, source, collection, self, obj) {
    var id, doc, html = [], changed = false, $this = $(self);
    console.log('select2display');

    if (!_.isArray(ids))
      ids = [ids];

    for (var i=0; i < ids.length; i++) {
      doc = collection.findOne(ids[i]);
      if (doc) {
        html.push(doc.name);
      } else {
        doc = collection.findOne({name: ids[i]});
        if (doc) {
          html.push(doc.name);
          ids[i] = doc._id;
          changed = true;
        } else {
          id = collection.insert({name: ids[i], lang: Session.get('lang')});
          html.push(ids[i]);
          ids[i] = id;
          changed = true;          
        }
      }     
    }

    $this.html(html.join(','));
    if (changed) {
      $this.data('value', ids.join(','));
      var id = $this.parents('[data-product-id]').data('product-id');
      var field = $this.data('id');
      obj.update(field, ids);
    }
  }

  Template['edit-product'].rendered = function() {
    var mTpl = Template['edit-product'];
    var editableSuccessTpl = _.partial(editableSuccess, mTpl.product);

    $('#edit-product span[data-id="company"]').editable({
      source: allCompanies,
      select2: { createSearchChoice: defaultCreateSearchChoice },
      display: function(ids, source) { select2display(ids, source, Companies, this, mTpl.product) },
      //success: function(response, newValue) { return addDocSuccess(Companies, newValue, this, mTpl); }
    });
    $('#edit-product span[data-id="categories"]').editable({
      source: allCategories,
      select2: { createSearchChoice: defaultCreateSearchChoice, multiple: true },
      display: function(ids, source) { select2display(ids, source, Categories, this, mTpl.product) },
      //success: function(response, newValue) { return addDocSuccess(Categories, newValue, this, mTpl); }
    });
    $('#edit-product span[data-id="ingredients"]').editable({
      select2: {
          width: '400px', multiple: true,
          createSearchChoice: defaultCreateSearchChoice },
      source: allIngredients, mode: 'inline',
      display: function(ids, source) { select2display(ids, source, Ingredients, this, mTpl.product) },
      //success: function(response, newValue) { return addDocSuccess(Ingredients, newValue, this, mTpl); }
    });
    $('#edit-product span[data-id="status"]').editable({
      source: allStatuses, emptytext: 'Unset', success: editableSuccessTpl
    });

    // anything that doesn't already have one
    $('#edit-product span').editable({ success: editableSuccessTpl });

    $('#modalStandard .btn-primary').click(function() {
        mTpl.product.save();
    });
  }

  Template['edit-product-trans'].rendered = function() {
    var mTpl = Template['edit-product-trans'];
    var editableSuccessTpl = _.partial(editableTransSuccess, mTpl.product);

    // anything that doesn't already have one
    $('#edit-product-trans span').editable({ success: editableSuccessTpl });

    $('#modalStandard .btn-primary').click(function() {
        mTpl.product.save();
    });
  }

  Template.products.events({
    'click a.edit': function(event) {
      var mTpl = Template['edit-product'];
      mTpl.product = new Product(this._id); 
      modal({title: 'Edit Product', body: function() { return new Handlebars.SafeString(mTpl()) }});
    },
    'click a.edit-trans': function(event) {
      var mTpl = Template['edit-product-trans'];
      mTpl.product = new Product(this._id);
      modal({title: mf('edit_prod_trans', null, 'Edit Product Translation'),
        body: function() { return new Handlebars.SafeString(mTpl()) } });
    }
  });

  transTemplate(Template['edit-product-trans']);

  editableSuccess = function(item, response, newValue, self) {
    if (!self) self = this;
    var $this = $(self), propName = $this.data('id');
    console.log('editableSuccess');

    // props.vegan.note, etc.
    if ($this.hasClass('prop'))
      propName = 'props.' + $this.parents('[data-prop]').data('prop') + '.' + propName;

    item.update(propName, newValue);
  }
  editableTransSuccess = function(item, response, newValue, self) {
    if (!self) self = this;
    var $this = $(self), propName = $this.data('id');
    console.log('editableTransSuccess');

    if ($this.hasClass('prop'))
      propName = 'props.' + $this.parents('[data-prop]').data('prop') + '.' + propName;

    propName = 'trans.' + Session.get('destLang') + '.' + propName;
    item.update(propName, newValue);
  }

  Template.search.events({
    'click #searchWrap span': function() {
      Session.set('QUERY_SEARCH', '');
      $('#query').val('');
        if (history && history.pushState) {
          history.pushState(null, '', makePath());
        }      
    }
  });

  Template.search.events({
    'keyup #query': _.debounce(function() {
      var query = $('#query').val();
      if (Session.equals('QUERY_SEARCH', '')) {
        if (history && history.pushState) {
          history.pushState(null, '', makePath({search: query}));
        }      
      } else {
        if (history && history.replaceState) {
          history.replaceState(null, '', makePath({search: query}));  
        }        
      }  
      Session.set('QUERY_SEARCH', query);
    }, 100)
  });

  Template.search.rendered = _.once(function() {
    var query = Session.get('QUERY_SEARCH');
    if (query) $('#query').val(query);
  });

  Template['add-product'].companies = function() {
    return Companies.find({}, {sort: {name: 1}}).fetch();
  }

  Template.langPicker.events({
    'click a': function() {
      var lang = Session.get('lang');
      lang = lang == 'he' ? 'en' : 'he';
      Session.set('lang', lang);
      Session.set('locale', lang);
    }
  });

  var alls = {
    allIngredients: { collection: Ingredients },
    allCompanies: { collection: Companies },
    allCategories: { collection: Categories }
  }

  Meteor.startup(function() {
    // allCompanies, allIngredients, etc. global vars
    for (key in alls) {
      window[key] = null;
      Deps.autorun((function(key) {
        return function() {
          var out = [], items = alls[key].collection.find({}, {sort:{name:1}}).fetch();
          _.each(items, function(item) {
            out.push( { id: item._id, text: getLang(item, 'name') });
          });
          window[key] = out;
        }
      })(key));
    }
  });

  modalData = {};
  Template.modalPlaceHolder.modal = function() {
    Session.get('modalData');
    if (!modalData.tplName)
      return '';
    var tpl = Template[modalData.tplName];
    var context = modalData.context;
    return new Handlebars.SafeString(tpl(context));
  }
  modal = function(context, tplName) {
      if (!tplName) tplName = 'modalStandard';
      modalData = { tplName: tplName, context: context };
      Session.set('modalData', new Date().getTime());
      _.defer(function() {
        $('#' + tplName).css({
          width: 'auto',
          'margin-left': function () {
            return -($(this).width() / 2);
          }
        });
        $('#' + tplName).modal('show')

      });
  }

  Session.setDefault('QUERY_UPC', '');
  Session.setDefault('QUERY_SEARCH', '');
  Session.setDefault('QUERY_BROWSE', '');

  function makePath(params) {
    var out = '/';
    var search = params && typeof params.search != 'undefined' ? params.search : Session.get('QUERY_SEARCH');
    var browse = params && typeof params.browse != 'undefined' ? params.browse : Session.get('QUERY_BROWSE');
    if (browse)
      out += 'browse/' + Categories.findOne(browse).name.replace(' ', '_');
    if (search)
      out += (browse ? '/' : '') + search;
    return out;
  }

  Meteor.Router.add({
    '/ingredients': 'ingredients',
    '/browse/:browse/:search': function(browse, search) {
      var obj = Categories.findOne({name: browse.replace('_', ' ')});
      Session.set('QUERY_UPC', '');
      Session.set('QUERY_SEARCH', search);
      Session.set('QUERY_BROWSE', obj ? obj._id : '');
      if (obj) $('#browseSelect').select2('val', obj._id);
      return 'main';      
    },
    '/browse/:id': function(id) {
      var obj = Categories.findOne({name: id.replace('_', ' ')});
      Session.set('QUERY_UPC', '');
      Session.set('QUERY_BROWSE', obj ? obj._id : '');
      if (obj) $('#browseSelect').select2('val', obj._id);
      return 'main';
    },
    '/upc/:id': function(id) {
      Session.set('QUERY_UPC', id);
      return 'main';
    },
    '/:query': function(query) {
      Session.set('QUERY_UPC', '');
      Session.set('QUERY_SEARCH', query);
      Session.set('QUERY_BROWSE', '');
      return 'main';
    },
    '*': function() {
      Session.set('QUERY_UPC', '');
      Session.set('QUERY_BROWSE', '');
      Session.set('QUERY_SEARCH', '');
      return 'main';
    }
  });
}
