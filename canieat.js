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

// TODO, check where user input is used unescaped

if (Meteor.isClient) {

/*
  Meteor.startup(function() {
    var path;
    if (location.pathname.length > 1) {
      path = location.pathname.substr(1);
      if (path.substr(0,4) == 'upc/') {
        Session.set('QUERY_TYPE', 'UPC');
        Session.set('QUERY_UPC', path.substr(4));
      } else if (path.substr(0,7) == 'browse/') {
        Session.set('QUERY_TYPE', 'BROWSE');
        var obj = Categories.findOne({name: path.substr(7)});
        Session.set('QUERY_BROWSE', obj ? obj._id : '');
      } else {
        $('#query').val(path);
        Session.set('QUERY_TYPE', 'SEARCH');
        Session.set('QUERY_SEARCH', path);
      }
    } else {
      Session.set('QUERY_TYPE', 'ALL');
    }
  });
*/

  Template.heading.browseName = function() {
    var id = Session.get('QUERY_BROWSE');
    var obj = Categories.findOne(id);
    return (obj && obj.name) || '...';
  }

  Template.products.products = function() {
    var query = {};
    switch (Session.get('QUERY_TYPE')) {
      case 'UPC': query.barcode = Session.get('QUERY_UPC'); break;
      case 'BROWSE': query.categories = Session.get('QUERY_BROWSE'); break;
      case 'SEARCH': query.name = {$regex: queryToRegExp(Session.get('QUERY_SEARCH')), $options: 'i'}; break;
    }
    return Products.find(query, { sort: { name: 1 } }).fetch();
  }

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
  }

  Template.browse.rendered = _.once(function() {
    var browse = Session.get('QUERY_BROWSE');
    if (browse) {
      $('#browseSelect').val(browse);
    } else {
      if (location.pathname.substr(0, 8) == '/browse/')
        var name = location.pathname.substr(8);
        var obj = Companies.findOne({name: name});
        if (obj) {
          console.log(obj._id);
          $('#browseSelect').val(obj._id);
        }
    }

    $('#browseSelect').select2({
      query: function(query) { query.callback({results: allCategories}); },
      placeholder: 'All Categories', allowClear: true,
      initSelection: function(element, callback) {
        var id = element.val();
        console.log(id);
        var obj = Categories.findOne(id);
        if (obj)
        callback({id: obj , text: obj.name});
      }
    });
    $('#browseSelect').on('change', function(e) {
      if (e.val == '') {
        Session.set('QUERY_TYPE', 'ALL');
        if (history && history.pushState) {
          history.pushState(null, '', '/');
        }
      } else {
        Session.set('QUERY_TYPE', 'BROWSE');
        Session.set('QUERY_BROWSE', e.val);
        if (history && history.pushState) {
          var name = Categories.findOne(e.val).name;
          history.pushState(null, '', '/browse/' + name);
        }
      }
    });
  });

  Template['edit-product'].props = templateProps;

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
              out.push({note: this.props[props[i]].note, source: this.props[props[i]].source});
            }
            break;
          case 'maybe':
            if (caneat != 'no') {
              caneat='maybe';
              out.push({note: this.props[props[i]].note, source: this.props[props[i]].source});
            }
            break;
          case 'no':
            caneat='no';
            out.push({note: this.props[props[i]].note, source: this.props[props[i]].source});
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
                out.push({name: ingredient.name, note: ingredient.props[props[i]].note, source: ingredient.props[props[i]].source });
              }
              break;
            case 'maybe':
              if (caneat != 'no') {
                caneat='maybe';
                out.push({name: ingredient.name, note: ingredient.props[props[i]].note, source: ingredient.props[props[i]].source });                
              }
              break;
            case 'no':
              caneat='no';
              out.push({name: ingredient.name, note: ingredient.props[props[i]].note, source: ingredient.props[props[i]].source });
              break;
          }          
        }
      }
    }

//    console.log(out);
    return out;
  }

  Template.actions.events({
    'click #add-product': function(event) {
      var mTpl = Template['add-product'];
      var editableSuccessTpl = _.partial(editableSuccess, mTpl);
      mTpl.product = new Product(this._id);

      modal({title: 'Add Product',
        body: new Handlebars.SafeString(mTpl()) });

      var el, select2s = {
        '#add-product-company': { data: allCompanies, multiple: false, createSearchChoice: defaultCreateSearchChoice },
        '#add-product-ingredients': { data: allIngredients, multiple: true, createSearchChoice: defaultCreateSearchChoice },
        '#add-product-categories': { data: allCategories, multiple: true, createSearchChoice: defaultCreateSearchChoice }
      }
      for (elId in select2s) {
        el = $(elId);
        if (!el.prev().hasClass('select2-container'))
          el.select2(select2s[elId]);
      }

      $('#modalStandard .btn-primary').click(function() {
        console.log(mTpl.product);
        mTpl.product.update({
          name: $('#add-product-name').val(),
          company: $('#add-product-company').val(),
          categories: $('#add-product-categories').val().split(','),
          barcode: $('#add-product-barcode').val(),
          ingredients: $('#add-product-ingredients').val().split(','),
          picURL: $('#add-product-picURL').val()
        });
        console.log(mTpl.product);
        mTpl.product.save();
      });
    }
  });

  function defaultCreateSearchChoice(term, data) {
    if ($(data).filter(function() { return this.text.localeCompare(term)===0; }).length===0) {
      var x = $('#edit-product span[data-id="company"]').data('editable');
      allCompanies.push({ id: term, text: term });
      x.options.source = allCompanies;
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
        name = id; id = collection.insert({name: name});
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
  function select2display(ids, source, collection, self) {
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
          id = collection.insert({name: ids[i]});
          html.push(ids[i]);
          ids[i] = id;
          changed = true;          
        }
      }     
    }

    $this.html(html.join(','));
    if (changed)
      $this.data('value', ids.join(','));
  }

  Template.products.events({
    'click a.edit': function(event) {
      var mTpl = Template['edit-product'];
      mTpl.product = new Product(this._id);
      var editableSuccessTpl = _.partial(editableSuccess, mTpl.product);

      modal({title: 'Edit Product',
        body: new Handlebars.SafeString(mTpl()) });

      $('#edit-product span[data-id="company"]').editable({
        source: allCompanies, display: function(ids, source) { select2display(ids, source, Companies, this) },
        select2: { createSearchChoice: defaultCreateSearchChoice },
        success: function(response, newValue) { return addDocSuccess(Companies, newValue, this, mTpl); }
      });
      $('#edit-product span[data-id="categories"]').editable({
        source: allCategories, display: function(ids, source) { select2display(ids, source, Categories, this) },
        select2: { createSearchChoice: defaultCreateSearchChoice, multiple: true },
        success: function(response, newValue) { return addDocSuccess(Categories, newValue, this, mTpl); }
      });
      $('#edit-product span[data-id="ingredients"]').editable({
        select2: {
            width: '400px', multiple: true,
            createSearchChoice: defaultCreateSearchChoice },
        source: allIngredients, mode: 'inline',
        display: function(ids, source) { select2display(ids, source, Ingredients, this) },
        success: function(response, newValue) { return addDocSuccess(Ingredients, newValue, this, mTpl); }
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
  });


  editableSuccess = function(item, response, newValue, self) {
    if (!self) self = this;
    var $this = $(self), propName = $this.data('id');
    console.log('editableSuccess');

    // props.vegan.note, etc.
    if ($this.hasClass('prop'))
      propName = 'props.' + $this.parents('[data-prop]').data('prop') + '.' + propName;

    item.update(propName, newValue);
  }

  Template.search.events({
    'keyup #query': _.debounce(function() {
      var query = $('#query').val();
      if (query.length == 0) {
        Session.set('QUERY_TYPE', 'ALL');
      } else {
        if (Session.equals('QUERY_TYPE', 'SEARCH')) {
          if (history && history.replaceState) {
            history.replaceState(null, '', '/' + query);  
          }        
        } else {
          Session.set('QUERY_TYPE', 'SEARCH');
          if (history && history.pushState) {
            history.pushState(null, '', '/' + query);
          }      
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
    return Companies.find().fetch();
  }

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
          var out = [], items = alls[key].collection.find().fetch();
          _.each(items, function(item) {
            out.push( { id: item._id, text: item.name });
          });
          window[key] = out;
        }
      })(key));
    }
  });

  modal = function(context, id) {
      if (!id) id = 'modalStandard';
      $('#' + id).replaceWith(Template[id](context));
      $('#' + id).modal('show');
      $('#' + id).css({
          width: 'auto',
          'margin-left': function () {
              return -($(this).width() / 2);
          }
      });
  }

  Meteor.Router.add({
    '/ingredients': 'ingredients',
    '/browse/:id': function(id) {
      Session.set('QUERY_TYPE', 'BROWSE');
      var obj = Categories.findOne({name: id});
      Session.set('QUERY_BROWSE', obj ? obj._id : '');
      if (obj) $('#browseSelect').select2('val', obj._id);
      return 'main';
    },
    '/upc/:id': function(id) {
      Session.set('QUERY_TYPE', 'UPC');
      Session.set('QUERY_UPC', id);
      return 'main';
    },
    '/:query': function(query) {
        console.log('query: ' + query);
        Session.set('QUERY_TYPE', 'SEARCH');
        Session.set('QUERY_SEARCH', query);
        return 'main';
    },
    '*': function() {
      console.log('default');
      Session.set('QUERY_TYPE', 'ALL');
      return 'main';
    }
  });
}


