/*
rules:
- ingredient
- company
- product

*/

if (Meteor.isClient) {

  Meteor.startup(function() {
    if (location.pathname.length > 1) {
      $('#query').val(location.pathname.substr(1));
    }
  });

  Template.products.products = function() {
    return Products.find({}, { sort: { name: 1 } }).fetch();
  }


  Template['edit-product'].props = function() {
    var out = '';
    for (var i = 0; i < props.length; i++) {
      var prop = props[i];
      var propObj = this.props && this.props[prop] ? this.props[prop] : {};
      out += '<tr data-prop="'+ prop +'"><td>' + prop.substr(0,1).toUpperCase() + prop.substr(1) + ':</td><td>'
        + '<span class="prop" data-type="select2" data-value="' + propObj.status + '" data-id="status"></span>'
        + ' { Note: <span class="prop" data-id="note" data-value="' + propObj.note + '"></span>,'
        + ' Source: <span class="prop" data-id="source" data-value="' + propObj.source + '"></span> }<td></tr>\n';
    }
    return new Handlebars.SafeString(out);
  }

  Template.products.caneat = function() {
    var caneat = null;

    if (this.props)
    for (var i=0; i < props.length; i++)
      if (this.props[props[i]])
      switch (this.props[props[i]].status) {
        case 'yes': if (caneat != 'no' || caneat != 'maybe') caneat='yes'; break;
        case 'maybe': if (caneat != 'no') caneat='maybe'; break;
        case 'no': caneat='no'; break;
      }

    console.log(caneat);
    return caneat;
  }
  Template.products.caneatMsg = function() {
    var caneat = null, out = [];

    if (this.props)
    for (var i=0; i < props.length; i++)
      if (this.props[props[i]])
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
        case 'no': caneat='no';
              out.push({note: this.props[props[i]].note, source: this.props[props[i]].source});
          break;
      }

    console.log(out);
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
        '#add-product-company': { data: allCompanies },
        '#add-product-ingredients': { tags: allIngredients },
        '#add-product-categories': { tags: allCategories }
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
          categories: $('#add-product-categories').val(),
          barcode: $('#add-product-barcode').val(),
          ingredients: $('#add-product-ingredients').val(),
          picURL: $('#add-product-picURL').val()
        });
        console.log(mTpl.product);
        //mTpl.product.save();
      });
    }
  });


  Template.products.events({
    'click a.edit': function(event) {
      var mTpl = Template['edit-product'];
      var editableSuccessTpl = _.partial(editableSuccess, mTpl);
      mTpl.product = new Product(this._id);
      console.log(this._id);
      console.log(mTpl.product);

      modal({title: 'Edit Product',
        body: new Handlebars.SafeString(mTpl()) });

      $('#edit-product span[data-id="company"]').editable({
        source: allCompanies, success: editableSuccessTpl
      });
      $('#edit-product span[data-id="ingredients"]').editable({
        mode: 'inline', success: editableSuccessTpl,
        select2: { tags: allIngredients, width: '400px' }
      });
      $('#edit-product span[data-id="categories"]').editable({
        select2: { tags: allCategories }, success: editableSuccessTpl
      });
      $('#edit-product span[data-id="status"]').editable({
        source: allStatuses, emptytext: 'Unset', success: editableSuccessTpl
      });

      // anything that doesn't already have one
      $('#edit-product span').editable({ success: editableSuccessTpl });

      $('#modalStandard .btn-primary').click(function() {
          console.log(mTpl.product);
          mTpl.product.save();
      });
    }
  });


  function editableSuccess(mTpl, response, newValue) {
    var $this = $(this), propName = $this.data('id');

    // props.vegan.note, etc.
    if ($this.hasClass('prop'))
      propName = 'props.' + $this.parents('[data-prop]').data('prop') + '.' + propName;

    mTpl.product.update(propName, newValue);
  }

  Template.search.events({
    'keyup #query': function() {
      Session.set('query', $('#query').val());
    }
  });

  Template['add-product'].companies = function() {
    return Companies.find().fetch();
  }

  allIngredients = null;
  Deps.autorun(function() {
    var out = [], ings = Ingredients.find().fetch();
    _.each(ings, function(ing) {
      out.push( { id: ing._id, text: ing.name });
    });
    allIngredients = out;
  });

  allCompanies = null;
  Deps.autorun(function() {
    var out = [], cs = Companies.find().fetch();
    _.each(cs, function(company) {
      out.push( { id: company._id, text: company.name });
    });
    allCompanies = out;
  });

  Template['add-company'].events({
    'submit': function(event) {
      event.preventDefault();
      var name = $('#add-company-name');
      companies.insert({name: name.val()});
      name.val('');
      return false;
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
}

