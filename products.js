if (Meteor.isClient) {

	var queryToRegExp = function(query) {
	  if (query.match(/^\/(.*)\/$/))
	    query = query.substr(1, query.length-2);
	  else
	    query = '(' + query + ')';
	  return query;
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
        var langs = _.keys(mfPkg.strings);
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

  var highlight = function() {
    var query = Session.get('QUERY_SEARCH');
    if (query && query.length > 0) {
      $('#productsDiv .name').each(function() {
        var $this = $(this), html;
        html = $this.attr('origText');
        if (!html) {
        	html = $this.html();
	        $this.attr('origText', html);
	      }
	      query = new RegExp('('+query+')', 'i');
	      if (html.match(query)) {
	      	$this.attr('highlighted', true);
	        $this.html(html.replace(query, '<span class="highlight">$1</span>'));
	      }
      });
    } else {
    	// restore
    	$('#productsDiv .name[highlighted]').each(function() {
    		var $this = $(this);
    		var html = $this.attr('origText');
    		$this.html(html);
    		$this.attr('highlighted', false);
    	});
    }	
  }
  Deps.autorun(highlight);

  Template.product.rendered = function() {
  	highlight();
  	return;

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

  Template.product.caneat = function() {
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
  Template.product.caneatMsg = function() {
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

  Template.product.show = function(caneat) {
    var type = Session.get('showType');
    return (type == 'all' || caneat == type) ? '' : 'displayNone';
  };


}