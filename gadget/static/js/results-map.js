// results-map.js
// By Michael Geary - http://mg.to/
// See UNLICENSE or http://unlicense.org/ for public domain notice.

function now() { return +new Date; }

var times = {
	gadgetLoaded: now()
};

var strings = {
	allCandidates: 'All Candidates',
	allCandidatesShort: 'All',
	percentReporting: '{{percent}} reporting ({{counted}}/{{total}})',
	percentReportingShort: '{{percent}} reporting',
	//countdownHeading: 'Live results in:',
	//countdownHours: '{{hours}} hours',
	//countdownHour: '1 hour',
	//countdownMinutes: '{{minutes}} minutes',
	//countdownMinute: '1 minute',
	noVotes: 'Waiting for results&hellip;'
};

var candidates = [
	{ color: '#DE6310', id: 'Bachmann', firstName: 'Michele', lastName: 'Bachmann', fullName: 'Michele Bachmann' },
	{ color: '#54F1F1', id: 'Cain', firstName: 'Herman', lastName: 'Cain', fullName: 'Herman Cain' },
	{ color: '#D50F25', id: 'Gingrich', firstName: 'Newt', lastName: 'Gingrich', fullName: 'Newt Gingrich' },
	{ color: '#666666', id: 'Huntsman', firstName: 'Jon', lastName: 'Huntsman', fullName: 'Jon Huntsman' },
	{ color: '#009925', id: 'Paul', firstName: 'Ron', lastName: 'Paul', fullName: 'Ron Paul' },
	{ color: '#3369E8', id: 'Perry', firstName: 'Rick', lastName: 'Perry', fullName: 'Rick Perry' },
	{ color: '#A58DF4', id: 'Roemer', firstName: 'Buddy', lastName: 'Roemer', fullName: 'Buddy Roemer' },
	{ color: '#EEB211', id: 'Romney', firstName: 'Mitt', lastName: 'Romney', fullName: 'Mitt Romney' },
	{ color: '#AA0C76', id: 'Santorum', firstName: 'Rick', lastName: 'Santorum', fullName: 'Rick Santorum' }
];
candidates.current = -1;

// Analytics
var _gaq = _gaq || [];
_gaq.push([ '_setAccount', 'UA-27854559-1' ]);
_gaq.push([ '_setDomainName', 'election-gadgets.appspot.com' ]);

// Voting results column offsets
var col = {};
col.candidates = 0;
col.ID = candidates.length;
col.NumVoters = col.ID + 1;
col.NumBallotBoxes = col.ID + 2;
col.NumCountedBallotBoxes = col.ID + 3;

function resultsFields() {
	return S(
		candidates.map( function( candidate ) {
			return S( "'VoteCount-", candidate.id, "'" );
		}).join( ',' ),
		',ID,NumVoters',
		',NumBallotBoxes,NumCountedBallotBoxes'
	);
}

document.write(
	'<style type="text/css">',
		'html, body { margin:0; padding:0; border:0 none; }',
	'</style>'
);

var gm, gme;

var $window = $(window), ww = $window.width(), wh = $window.height();

var data = {
	counties: { geo:null, results:null },
	states: { geo:null, results:null }
};

var $map, mapPixBounds;

var debug = params.debug;
opt.state = params.state || '';
opt.counties = true;
opt.candidate = '1';
//opt.zoom = opt.zoom || 3;
opt.fontsize = '15px';
var sidebarWidth = 320;

opt.resultCacheTime = 60 * 1000;
opt.reloadTime = 120 * 1000;

// Non-auto-refresh settings to use after results are final
//opt.resultCacheTime = Infinity;  // cache forever
//opt.reloadTime = false;  // no auto-reload

var zoom;

if( ! Array.prototype.forEach ) {
	Array.prototype.forEach = function( fun /*, thisp*/ ) {
		if( typeof fun != 'function' )
			throw new TypeError();
		
		var thisp = arguments[1];
		for( var i = 0, n = this.length;  i < n;  ++i ) {
			if( i in this )
				fun.call( thisp, this[i], i, this );
		}
	};
}

if( ! Array.prototype.map ) {
	Array.prototype.map = function( fun /*, thisp*/ ) {
		var len = this.length;
		if( typeof fun != 'function' )
			throw new TypeError();
		
		var res = new Array( len );
		var thisp = arguments[1];
		for( var i = 0;  i < len;  ++i ) {
			if( i in this )
				res[i] = fun.call( thisp, this[i], i, this );
		}
		
		return res;
	};
}

Array.prototype.mapjoin = function( fun, delim ) {
	return this.map( fun ).join( delim || '' );
};

if( ! Array.prototype.index ) {
	Array.prototype.index = function( field ) {
		this.by = this.by || {};
		if( field ) {
			var by = this.by[field] = {};
			for( var i = 0, n = this.length;  i < n;  ++i ) {
				var obj = this[i];
				by[obj[field]] = obj;
				obj.index = i;
			}
		}
		else {
			var by = this.by;
			for( var i = 0, n = this.length;  i < n;  ++i ) {
				var str = this[i];
				by[str] = str;
				str.index = i;
			}
		}
		return this;
	};
}

Array.prototype.random = function() {
	return this[ randomInt(this.length) ];
};

// See scriptino-base.js in scriptino project for documentation
function sortArrayBy( array, key, opt ) {
	opt = opt || {};
	var sep = unescape('%uFFFF');
	var i = 0, n = array.length, sorted = new Array( n );
	
	// Separate loops for each case for speed
	if( opt.numeric ) {
		if( typeof key == 'function' ) {
			for( ;  i < n;  ++i )
				sorted[i] = [ ( 1000000000000000 + key(array[i]) + '' ).slice(-15), i ].join(sep);
		}
		else {
			for( ;  i < n;  ++i )
				sorted[i] = [ ( 1000000000000000 + array[i][key] + '' ).slice(-15), i ].join(sep);
		}
	}
	else {
		if( typeof key == 'function' ) {
			for( ;  i < n;  ++i )
				sorted[i] = [ key(array[i]), i ].join(sep);
		}
		else if( opt.caseDependent ) {
			for( ;  i < n;  ++i )
				sorted[i] = [ array[i][key], i ].join(sep);
		}
		else {
			for( ;  i < n;  ++i )
				sorted[i] = [ array[i][key].toLowerCase(), i ].join(sep);
		}
	}
	
	sorted.sort();
	
	var output = new Array( n );
	for( i = 0;  i < n;  ++i )
		output[i] = array[ sorted[i].split(sep)[1] ];
	
	return output;
}

String.prototype.repeat = function( n ) {
	return new Array( n + 1 ).join( this );
};

String.prototype.trim = function() {
	return this.replace( /^\s\s*/, '' ).replace( /\s\s*$/, '' );
};

String.prototype.words = function( fun ) {
	this.split(' ').forEach( fun );
};

String.prototype.T = function( args ) {
	return ( /*prefs.getMsg(this) ||*/ strings[this] || '' ).replace( /\{\{(\w+)\}\}/g,
		function( match, name ) {
			var value = args[name];
			return value != null ? value : match;
		});
}

function S() {
	return Array.prototype.join.call( arguments, '' );
}

function join( array, delim ) {
	return Array.prototype.join.call( array, delim || '' );
}

function Cache() {
	this.cache = {};
}

$.extend( Cache.prototype, {
	add: function( key, value, time ) {
		this.cache[key] = { value: value, expire: now() + time };
		//console.log( 'cache#add', key, this.cache[key].expire );
	},
	get: function( key, loader ) {
		var item = this.cache[key];
		if( ! item ) {
			//console.log( 'cache#get miss', key );
			return null;
		}
		var expired = now() > item.expire;
		if( expired ) {
			//console.log( 'cache#get expired', key );
			delete this.cache[key];
			return null;
		}
		//console.log( 'cache#get hit', key );
		return item.value;
	},
	remove: function( key ) {
		//console.log( 'cache#remove', key );
		delete this.cache[key];
	}
});

jQuery.extend( jQuery.fn, {
	bindSelector: function( events, listener, delay ) {
		var timer;
		this.bind( events, function() {
			var self = this, args = arguments;
			if( timer ) clearTimeout( timer );
			timer = setTimeout( function() {
				timer = null;
				listener.apply( self, args );
			}, delay || 50 );
		});
	},
	
	bounds: function() {
		var offset = this.offset();
		return {
			left: offset.left,
			right: offset.left + this.width(),
			top: offset.top,
			bottom: offset.top + this.height()
		};
	}
//	html: function( a ) {
//		if( a == null ) return this[0] && this[0].innerHTML;
//		return this.empty().append( join( a.charAt ? arguments : a ) );
//	},
//	setClass: function( cls, yes ) {
//		return this[ yes ? 'addClass' : 'removeClass' ]( cls );
//	}
});

function randomInt( n ) {
	return Math.floor( Math.random() * n );
}

// hoverize.js
// Based on hoverintent plugin for jQuery

(function( $ ) {
	
	var opt = {
		slop: 7,
		interval: 200
	};
	
	function start() {
		if( ! timer ) {
			timer = setInterval( check, opt.interval );
			$(document.body).bind( 'mousemove', move );
		}
	}
	
	function clear() {
		if( timer ) {
			clearInterval( timer );
			timer = null;
			$(document.body).unbind( 'mousemove', move );
		}
	}
	
	function check() {
		if ( ( Math.abs( cur.x - last.x ) + Math.abs( cur.y - last.y ) ) < opt.slop ) {
			clear();
			for( var i  = 0,  n = functions.length;  i < n;  ++i )
				functions[i]();
		}
		else {
			last = cur;
		}
	}
	
	function move( e ) {
		cur = { x:e.screenX, y:e.screenY };
	}
	
	var timer, last = { x:0, y:0 }, cur = { x:0, y:0 }, functions = [];
	
	hoverize = function( fn, fast ) {
		
		function now() {
			fast && fast.apply( null, args );
		}
		
		function fire() {
			clear();
			return fn.apply( null, args );
		}
		functions.push( fire );
		
		var args;
		
		return {
			clear: clear,
			
			now: function() {
				args = arguments;
				now();
				fire();
			},
			
			hover: function() {
				args = arguments;
				now();
				start();
			}
		};
	}
})( jQuery );

candidates.index('id');

function cacheUrl( url ) {
	return opt.nocache ? S( url, '?q=', times.gadgetLoaded ) : url;
}

function imgUrl( name ) {
	return cacheUrl( 'images/' + name );
}

document.body.scroll = 'no';

document.write(
	'<style type="text/css">',
		'html, body { width:', ww, 'px; height:', wh, 'px; margin:0; padding:0; overflow:hidden; }',
		'* { font-family: Arial,sans-serif; font-size: ', opt.fontsize, '; }',
		'#outer {}',
		'.barvote { font-weight:bold; color:white; }',
		'h2 { font-size:11pt; margin:0; padding:0; }',
		'.content table { xwidth:100%; }',
		'.content .contentboxtd { width:7%; }',
		'.content .contentnametd { xfont-size:24px; xwidth:18%; }',
		'.content .contentbox { height:24px; width:24px; xfloat:left; margin-right:4px; }',
		'.content .contentname { xfont-size:12pt; white-space:pre; }',
		'.content .contentvotestd { text-align:right; width:5em; }',
		'.content .contentpercenttd { text-align:right; width:2em; }',
		'.content .contentvotes, .content .contentpercent { xfont-size:', opt.fontsize, '; margin-right:4px; }',
		'.content .contentclear { clear:left; }',
		'.content .contentreporting { margin-bottom:8px; }',
		'.content .contentreporting * { xfont-size:20px; }',
		'.content {}',
		'#content-scroll { overflow:scroll; overflow-x:hidden; }',
		'#maptip { position:absolute; z-index:10; border:1px solid #333; background:white; color:#222; white-space: nowrap; display:none; width:275px; }',
		'#maptip table.candidates { width:100%; }',
		'div.candidate-name { line-height:1em; }',
		'div.first-name { font-size:85%; }',
		'body.tv div.candidate-name { margin-right:20px; }',
		'body.tv div.candidate-name div { line-height:1.1em; }',
		'body.tv div.first-name { font-size:20px; }',
		'body.tv div.last-name { font-size:24px; font-weight:bold; }',
		'body.tv td.candidate-percent { font-size:20px; font-weight:bold; }',
		'body.tv #maptip { border:none; }',
		'body.tv #map { border-left:1px solid #333; }',
		'body.tv span.tiptitletext { font-size:28px; }',
		'body.tv div.tipreporting { font-size:20px; }',
		'body.tv table.candidates td { padding:4px 0; }',
		'.tiptitlebar { padding:4px 8px; border-bottom:1px solid #AAA; }',
		'.tiptitletext { font-weight:bold; font-size:120%; }',
		'.tipcontent { padding:4px 8px 8px 8px; border-bottom:1px solid #AAA; }',
		'.tipreporting { font-size:80%; padding:2px 0; }',
		'#selectors { background-color:#D0E3F8; }',
		'#selectors, #selectors * { font-size:14px; }',
		'#selectors label { font-weight:bold; }',
		'#selectors, #legend { width:100%; border-bottom:1px solid #C2C2C2; }',
		'#legend { background-color:white; }',
		'body.tv #legend { margin-top:8px; }',
		'td.legend-candidate, td.legend-filler { border:1px solid white; }',
		'div.legend-candidate, div.legend-filler { font-size:13px; padding:4px; }',
		//'body.tv div.legend-candidate, body.tv div.legend-filler { font-size:22px; }',
		'body.web div.legend-candidate { color:#333; }',
		'body.tv div.legend-candidate, body.tv div.legend-filler { font-size:21px; font-weight:bold; }',
		'td.legend-filler { border-color:transparent; }',
		'td.legend-candidate { width:20%; }',
		'td.legend-candidate { cursor:pointer; }',
		'td.legend-candidate.hover { background-color:#F5F5F5; border:1px solid #D9D9D9; }',
		'td.legend-candidate.selected { background-color:#E7E7E7; border:1px solid #CCCCCC; }',
		'span.legend-candidate-color { font-size:15px; }',
		'body.tv span.legend-candidate-color { font-size:18px; }',
		'table.candidates td { border-top:1px solid #E7E7E7; }',
		'table.candidates tr.first td { border-top:none; }',
		'#centerlabel, #centerlabel * { font-size:12px; xfont-weight:bold; }',
		'#spinner { z-index:999999; position:absolute; left:', Math.floor( ww/2 - 64 ), 'px; top:', Math.floor( wh/2 - 20 ), 'px; }',
		'#error { z-index:999999; position:absolute; left:4px; bottom:4px; border:1px solid #888; background-color:#FFCCCC; font-weight:bold; padding:6px; }',
		'a.logo { display:none; position:absolute; bottom:24px; width:48px; height:48px;}',
		'#party-logo { right:62px; background: url(', imgUrl('gop-iowa-48.png'), ') no-repeat; }',
		'#google-logo { right:4px; background: url(', imgUrl('google-politics-48.png'), ') no-repeat; }',
	'</style>'
);


var index = 0;
function option( value, name, selected, disabled ) {
	var html = optionHTML( value, name, selected, disabled );
	++index;
	return html;
}

function optionHTML( value, name, selected, disabled ) {
	var id = value ? 'id="option-' + value + '" ' : '';
	var style = disabled ? 'color:#AAA; font-style:italic; font-weight:bold;' : '';
	selected = selected ? 'selected="selected" ' : '';
	disabled = disabled ? 'disabled="disabled" ' : '';
	return S(
		'<option ', id, 'value="', value, '" style="', style, '" ', selected, disabled, '>',
			name,
		'</option>'
	);
}

function stateOption( state, selected ) {
	state.selectorIndex = index;
	return option( state.id, state.name, selected );
}

document.write(
	'<div id="outer">',
	'</div>',
	'<div id="maptip">',
	'</div>',
	'<a id="party-logo" class="logo" target="_blank" href="http://www.iowagop.org/" title="Iowa GOP">',
	'</a>',
	'<a id="google-logo" class="logo" target="_blank" href="http://www.google.com/elections" title="Google Election News">',
	'</a>',
	'<div id="error" style="display:none;">',
	'</div>',
	'<div id="spinner">',
		'<img border="0" style="width:128px; height:128px;" src="', imgUrl('spinner-124.gif'), '" />',
	'</div>'
);

function contentTable() {
	return S(
		'<div>',
			//'<div id="selectors">',
			//	'<div style="margin:0; padding:6px;">',
			//		//'<label for="stateSelector">',
			//		//	'stateLabel'.T(),
			//		//'</label>',
			//		//'<select id="stateSelector">',
			//		//	option( '-1', 'nationwideLabel'.T() ),
			//		//	option( '', '', false, true ),
			//		//	sortArrayBy( data.states.geo.features, 'name' )
			//		//		.mapjoin( function( state ) {
			//		//			return stateOption(
			//		//				state,
			//		//				state.abbr == opt.state
			//		//			);
			//		//		}),
			//		//'</select>',
			//		//'&nbsp;&nbsp;&nbsp;',
			//		//'&nbsp;&nbsp;&nbsp;',
			//		//'<input type="checkbox" id="chkCounties">',
			//		//'<label for="chkCounties">', 'countiesCheckbox'.T(), '</label>',
			//	'</div>',
			//'</div>',
			'<div id="legend">',
				formatLegendTable( [] ),
			'</div>',
			'<div id="sidebar">',
			'</div>',
			'<div style="width:100%;">',
				'<div id="map" style="width:100%; height:100%;">',
				'</div>',
			'</div>',
		'</div>'
	);
}

function formatLegendTable( cells ) {
	function filler() {
		return S(
			'<td class="legend-filler">',
				'<div class="legend-filler">',
					'&nbsp;',
				'</div>',
			'</td>'
		);
	}
	function row( cells ) {
		return S(
			'<tr>',
				cells.length ? cells.join('') : filler(),
			'</tr>'
		);
	}
	return S(
		'<table cellpadding="0" cellspacing="0" style="width:100%; vertical-align:middle;">',
			row( cells.slice( 0, 5 ) ),
			row( cells.slice( 5 ) ),
		'</table>'
	);
}

(function( $ ) {
	
	// TODO: Refactor and use this exponential retry logic
	//function getJSON( type, path, file, cache, callback, retries ) {
	//	var stamp = now();
	//	if( ! opt.nocache ) stamp = Math.floor( stamp / cache / 1000 );
	//	if( retries ) stamp += '-' + retries;
	//	if( retries == 3 ) showError( type, file );
	//	_IG_FetchContent( path + file + '?' + stamp, function( json ) {
	//		// Q&D test for bad JSON
	//		if( json && json.charAt(0) == '{' ) {
	//			$('#error').hide();
	//			callback( eval( '(' + json + ')' ) );
	//		}
	//		else {
	//			reportError( type, file );
	//			retries = ( retries || 0 );
	//			var delay = Math.min( Math.pow( 2, retries ), 128 ) * 1000;
	//			setTimeout( function() {
	//				getJSON( type, path, file, cache, callback, retries + 1 );
	//			}, delay );
	//		}
	//	}, {
	//		refreshInterval: opt.nocache ? 1 : cache
	//	});
	//}
	
	var jsonRegion = {};
	function loadRegion() {
		var level = 100;
		//var kind = ( opt.counties ? 'counties' : 'states' );
		var kind = 'county';  // TEMP
		var fips = '19';  // TEMP
		var json = jsonRegion[kind];
		if( json ) {
			loadGeoJSON( json );
		}
		else {
			var file = S( 'c2010.', kind, '-', fips, '-goog_geom_', level, '.jsonp' );
			getGeoJSON( 'shapes/json/' + file );
		}
	}
	
	function getScript( url ) {
		$.ajax({
			url: url,
			dataType: 'script',
			cache: true
		});
	}
	
	function getGeoJSON( url ) {
		$('#spinner').show();
		getScript( cacheUrl( url ) );
	}
	
	var didLoadGeoJSON;
	loadGeoJSON = function( json ) {
		function oneTime() {
			if( ! didLoadGeoJSON ) {
				didLoadGeoJSON = true;
				$('#outer').html( contentTable() );
				initSelectors();
				$map = $('#map');
			}
		}
		json.kind = 'county';  // TEMP
		jsonRegion[json.kind] = json;
		//debugger;
		var loader = {
			// TODO: refactor
			state: function() {
				json.features.index('id').index('abbr');
				data.states.geo = json;
				oneTime();
				//setCounties( false );
				getResults();
				analytics( '/states' );
			},
			county: function() {
				json.features.index('id').index('abbr');
				data.counties.geo = json;
				oneTime();
				//setCounties( true );
				getResults();
				analytics( '/counties' );
			}
		}[json.kind];
		loader();
	};
	
	function setPlayback() {
		var play = getPlaybackParams();
		if( ! play ) return;
		play.player.setup();
		setInterval( play.player.tick, play.time );
	}
	
	function getPlaybackParams() {
		var play = params.play;
		if( ! play ) return false;
		play = play.split( ',' );
		var time = Math.max( play[1] || 5000, 1000 );
		var type = play[0];
		var player = players[type];
		if( ! player ) return false;
		return {
			player: player,
			type: type,
			time: time
		};
	}
	
	function playType() {
		var play = getPlaybackParams();
		return play && play.type;
	}
	
	function playCandidates() {
		return playType() == 'candidates';
	}
	
	function playCounties() {
		return playType() == 'counties';
	}
	
	function useSidebar() {
		return !! playCounties();
	}
	
	function autoplay() {
		return !! playType();
	}
	
	function interactive() {
		return ! autoplay();
	}
	
	function tv() {
		return autoplay();
	}
	
	function web() {
		return ! tv();
	}
	
	var players = {
		candidates: {
			setup: function() {
			},
			tick: function() {
				var topCandidates = topCandidatesByVote(
					totalResults( currentResults() )
				);
				if( candidates.current == -1 ) {
					i = 0;
				}
				else {
					for( var i = 0;  i < topCandidates.length;  ++i ) {
						if( topCandidates[i].id == candidates.current ) {
							++i;
							if( i >= topCandidates.length )
								i = -1;
							break;
						}
					}
				}
				candidates.current = ( i == -1 ? i : topCandidates[i].id );
				setCandidate( candidates.current );
			}
		},
		counties: {
			setup: function() {
				var features = data.counties.geo.features;
				//features.playOrder = sortArrayBy( features, function( feature ) {
				//	return(
				//		-feature.centroid[1] * 1000000000 + feature.centroid[0]
				//	);
				//});
				features.playOrder = sortArrayBy( features, 'name' );
			},
			tick: function() {
				var features = data.counties.geo.features,
					rowsByID = data.counties.results.rowsByID;
				var order = features.playOrder,
					next = order.next, length = order.length;
				if( ! next  ||  next >= length ) next = 0;
				while( next < length ) {
					var feature = order[next++], id = feature.id;
					var row = rowsByID[id];
					var use = row && row[col.NumCountedBallotBoxes];
					if( use ) {
						outlineFeature( feature );
						showTip( feature );
						break;
					}
				}
				order.next = next;
			}
		}
	};
	
	var setCountiesFirst = true;
	function setCounties( counties, force ) {
		counties = !! counties;
		if( counties == opt.counties  &&  ! force  &&  ! setCountiesFirst )
			return;
		setCountiesFirst = false;
		opt.counties = counties;
		$('#chkCounties').prop( 'checked', counties );
		loadView();
	}
	
	function showError( type, file ) {
		file = file.replace( '.json', '' ).replace( '-all', '' ).toUpperCase();
		$('#error').html( S( '<div>Error loading ', type, ' for ', file, '</div>' ) ).show();
		$('#spinner').hide();
	}
	
	function reportError( type, file ) {
		analytics( '/' + type + '/' + file );
	}
	
	function analytics( path ) {
		analytics.seen = analytics.seen || {};
		if( analytics.seen[path] ) return;
		analytics.seen[path] = true;
		_gaq.push([ '_trackPageview', '/results' + path ]);
	}
	
	function htmlEscape( str ) {
		var div = document.createElement( 'div' );
		div.appendChild( document.createTextNode( str ) );
		return div.innerHTML;
	}
	
	function percent( n ) {
		var p = Math.round( n * 100 );
		if( p == 100  &&  n < 1 ) p = 99;
		if( p == 0  && n > 0 ) p = '&lt;1';
		return p + '%';
	}
	
	//NationwideControl = function( show ) {
	//	return $.extend( new GControl, {
	//		initialize: function( map ) {
	//			var $control = $(S(
	//				'<div style="color:black; font-family:Arial,sans-serif;">',
	//					'<div style="background-color:white; border:1px solid black; cursor:pointer; text-align:center; width:6em;">',
	//						'<div style="border-color:white #B0B0B0 #B0B0B0 white; border-style:solid; border-width:1px; font-size:12px;">',
	//							'nationwideLabel'.T(),
	//						'</div>',
	//					'</div>',
	//				'</div>'
	//			)).click( function() { setState(stateUS); } ).appendTo( map.getContainer() );
	//			return $control[0];
	//		},
	//		
	//		getDefaultPosition: function() {
	//			return new GControlPosition( G_ANCHOR_TOP_LEFT, new GSize( 50, 9 ) );
	//		}
	//	});
	//};
	
	$('body').addClass( autoplay() ? 'autoplay' : 'interactive' );
	$('body').addClass( tv() ? 'tv' : 'web' );
	if( useSidebar() ) $('body').addClass( 'sidebar' );

	var map, gonzo;
	
	var overlays = [];
	overlays.clear = function() {
		while( overlays.length ) overlays.pop().setMap( null );
	};
	
	//var state = states[opt.state];
	
	function pointLatLng( point ) {
		return new gm.LatLng( point[1], point[0] );
	}
	
	function randomColor() {
		return '#' + hh() + hh() + hh();
	}
	
	function randomGray() {
		var h = hh();
		return '#' + h + h + h;
	}
	
	function hh() {
		var xx = Math.floor( Math.random() *128 + 96 ).toString(16);
		return xx.length == 2 ? xx : '0'+xx;
	}
	
	var reloadTimer;
	
	var geoMoveNext = true;
	var polyTimeNext = 250;
	
	var didGeoReady;
	function geoReady() {
		setLegend();
		var mapTop = $map.offset().top;
		$map.height( wh - mapTop );
		if( useSidebar() ) {
			var $sidebar = $('#sidebar');
			$sidebar.css({
				position: 'absolute',
				left: 0,
				top: mapTop,
				width: sidebarWidth
			});
			$map.css({
				position: 'absolute',
				left: sidebarWidth,
				top: mapTop,
				width: ww - sidebarWidth
			});
			$maptip.remove().appendTo( $sidebar ).css({ width:'100%' });
		}
		if( geoMoveNext ) {
			geoMoveNext = false;
			moveToGeo();
		}
		polys();
		$('#spinner').hide();
		if( ! params.randomize  &&   opt.reloadTime  &&  ! reloadTimer )
			reloadTimer = setInterval( loadView, opt.reloadTime );
		if( ! didGeoReady ) {
			setPlayback();
			didGeoReady = true;
		}
	}
	
	function currentGeos() {
		//data.states.geo.hittest = ! opt.counties;
		return opt.counties ?
			[ data.counties.geo, data.states.geo ] :
			[ data.states.geo ];
	}
	
	function currentResults() {
		return currentData().results;
	}
	
	function currentData() {
		return opt.counties ? data.counties: data.states;
	}
	
	function moveToGeo() {
		var json = currentGeos()[0];  // TODO
		$('#map').show();
		initMap();
		gme.trigger( map, 'resize' );
		//overlays.clear();
		//$('script[title=jsonresult]').remove();
		//if( json.status == 'later' ) return;
		fitBbox( json.bbox );
	}
	
	function fitBbox( bbox ) {
		if( ! bbox ) return;
		// TEMP
		bbox = [ -96.6372, 40.3741, -90.1416, 43.5014 ];
		// END TEMP
		//bbox = shrinkBbox( bbox, .10 );
		var bounds = new gm.LatLngBounds(
			new gm.LatLng( bbox[1], bbox[0] ),
			new gm.LatLng( bbox[3], bbox[2] )
		);
		if( params.zoom != 'auto' ) {
			params.zoom = params.zoom || 7;
			map.setCenter( bounds.getCenter() );
			map.setZoom( +params.zoom );
		}
		else {
			map.fitBounds( bounds );
		}
		zoom = map.getZoom();
	}
	
	//function shrinkBbox( bbox, amount ) {
	//	var dx = ( bbox[2] - bbox[0] ) * amount / 2;
	//	var dy = ( bbox[3] - bbox[1] ) * amount / 2;
	//	return [
	//		bbox[0] + dx,
	//		bbox[1] + dy,
	//		bbox[2] - dx,
	//		bbox[3] - dy
	//	];
	//}
	
	var  mouseFeature;
	
	function getStateCounties( features, state ) {
		var counties = [];
		for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
			if( feature.state.toUpperCase() == curState.abbr )
				counties.push( feature );
		}
		return counties;
	}
	
	function polys() {
		colorize( /* ?? */ );
		var $container = $('#map');
		function getFeature( event, where ) {
			return where && where.feature;
		}
		var events = playType() ? {} : {
			mousedown: function( event, where ) {
			},
			mouseup: function( event, where ) {
			},
			mousemove: function( event, where ) {
				var feature = getFeature( event, where );
				if( feature == mouseFeature ) return;
				mouseFeature = feature;
				map.setOptions({ draggableCursor: feature ? 'pointer' : null });
				outlineFeature( feature );
				showTip( feature );
			},
			click: function( event, where ) {
				events.mousemove( event, where );
				//var feature = getFeature( event, where );
				//if( ! feature ) return;
				//if( feature.type == 'state'  || feature.type == 'cd' )
				//	setState( feature.state );
			}
		};
		//overlays.clear();
		// Let map display before drawing polys
		function draw() {
			var overlay = new PolyGonzo.PgOverlay({
				map: map,
				geos: currentGeos(),
				events: events
			});
			overlay.setMap( map );
			setTimeout( function() {
				overlays.clear();
				overlays.push( overlay );
			}, 1 );
			//overlay.redraw( null, true );
		}
		var pt = polyTimeNext;
		polyTimeNext = 0;
		if( pt ) setTimeout( draw, 250 );
		else draw();
	}
	
	function colorize( /* ?? */ ) {
		//if( opt.counties ) {
		//	var features = data.states.geo.features;
		//	for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
		//		feature.fillColor = '#000000';
		//		feature.fillOpacity = 0;
		//		feature.strokeColor = '#666666';
		//		feature.strokeOpacity = 1;
		//		feature.strokeWidth = 2;
		//	}
		//}
		if( opt.counties ) {
			var source = data.counties, strokeWidth = 1.33, strokeColor = '#222222';
		}
		else {
			var source = data.states, strokeWidth = 2, strokeColor = '#222222';
		}
		var features = source.geo.features, results = source.results;
		var isMulti = ( candidates.current  == -1 );
		if( isMulti ) {
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				var id = feature.id;
				var row = results.rowsByID[id];
				var candidate = row && candidates[row.candidateMax];
				if( candidate ) {
					feature.fillColor = candidate.color;
					feature.fillOpacity = .6;
				}
				else {
					feature.fillColor = '#FFFFFF';
					feature.fillOpacity = 0;
				}
				var complete =
					row[col.NumCountedBallotBoxes] == row[col.NumBallotBoxes];
				feature.strokeColor = strokeColor;
				feature.strokeOpacity = 1;
				feature.strokeWidth = strokeWidth;
			}
		}
		else {
			var rows = results.rows;
			var max = 0;
			var candidate = candidates.by.id[candidates.current], color = candidate.color, index = candidate.index;
			var nCols = candidates.length;
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				var id = feature.id;
				var row = results.rowsByID[id];
				var total = 0, value = 0;
				if( row ) {
					var total = 0;
					for( var iCol = -1;  ++iCol < nCols; )
						total += row[iCol];
					value = row[index];
					max = Math.max( max,
						row.fract = total ? value / total : 0
					);
				}
			}
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				var id = feature.id;
				var row = results.rowsByID[id];
				feature.fillColor = color;
				feature.fillOpacity = row && max ? row.fract / max : 0;
				var complete =
					row[col.NumCountedBallotBoxes] == row[col.NumBallotBoxes];
				feature.strokeColor = strokeColor;
				feature.strokeOpacity = 1;
				feature.strokeWidth = strokeWidth;
			}
		}
	}
	
	// TODO: refactor this into PolyGonzo
	var outlineOverlay;
	function outlineFeature( feature ) {
		if( outlineOverlay )
			outlineOverlay.setMap( null );
		outlineOverlay = null;
		if( ! feature ) return;
		var geo = currentGeos()[0];
		var feat = $.extend( {}, feature, {
			fillColor: '#000000',
			fillOpacity: 0,
			strokeWidth: playCounties() ? 5 : opt.counties ? 3 : 4,
			strokeColor: '#000000',
			strokeOpacity: 1
		});
		outlineOverlay = new PolyGonzo.PgOverlay({
			map: map,
			geos: [{
				crs: geo.crs,
				kind: geo.kind,
				features: [ feat ]
			}]
		});
		outlineOverlay.setMap( map );
	}
	
	function getSeats( race, seat ) {
		if( ! race ) return null;
		if( seat == 'One' ) seat = '1';
		if( race[seat] ) return [ race[seat] ];
		if( race['NV'] ) return [ race['NV'] ];
		if( race['2006'] && race['2008'] ) return [ race['2006'], race['2008'] ];
		return null;
	}
	
	var tipOffset = { x:10, y:20 };
	var $maptip, tipHtml;
	if( ! playType() )
		$('body').bind( 'click mousemove', moveTip );
	
	function showTip( feature ) {
		if( ! $maptip ) $maptip = $('#maptip');
		tipHtml = formatTip( feature );
		if( tipHtml ) {
			$maptip.html( tipHtml ).show();
		}
		else {
			$maptip.hide();
			mouseFeature = null;
		}
	}
	
	function formatCandidateAreaPatch( candidate, max ) {
		var size = Math.round( Math.sqrt( candidate.vsTop ) * max );
		var margin1 = Math.floor( ( max - size ) / 2 );
		var margin2 = max - size - margin1;
		return S(
			'<div style="margin:', margin1, 'px ', margin2, 'px ', margin2, 'px ', margin1, 'px;">',
				formatDivColorPatch( candidate.color, size, size ),
			'</div>'
		);
	}
	
	function formatDivColorPatch( color, width, height, border ) {
		border = border || '1px solid #C2C2C2';
		return S(
			'<div style="background:', color, '; width:', width, 'px; height:', height, 'px; border:', border, '">',
			'</div>'
		);
	}
	
	function formatSpanColorPatch( colors, spaces, border ) {
		if( ! colors.push ) colors = [ colors ];
		border = border || '1px solid #C2C2C2';
		return S(
			'<span class="legend-candidate-color" style="border:', border, '; zoom:1;">',
				colors.mapjoin( function( color ) {
					return S(
						'<span class="legend-candidate-color" style="background:', color, '; zoom:1;">',
							'&nbsp;'.repeat( spaces || 6 ),
						'</span>'
					);
				}),
			'</span>'
		);
	}
	
	function formatCandidateIcon( candidate, size ) {
		return S(
			'<div style="background:url(', imgUrl('candidate-photos-'+size+'.png'), '); background-position:-', candidate.index * size, 'px 0px; width:', size, 'px; height:', size, 'px; border:1px solid #C2C2C2;">',
			'</div>'
		);
	}
	
	function totalResults( results ) {
		var rows = results.rows;
		var total = [];
		for( var row, i = -1;  row = rows[++i]; )
			for( var n = row.length, j = -1;  ++j < n; )
				total[j] = ( total[j] || 0 ) + row[j];
		return total;
	}
	
	function totalReporting( results ) {
		var rows = results.rows;
		var counted = 0, total = 0;
		for( var row, i = -1;  row = rows[++i]; ) {
			counted += row[col.NumCountedBallotBoxes];
			total += row[col.NumBallotBoxes];
		}
		return counted / total;
	}
	
	function topCandidatesByVote( result, max ) {
		max = max || Infinity;
		if( ! result ) return [];
		if( result == -1 ) result = totalResults( currentResults() );
		var top = candidates.slice();
		for( var i = -1;  ++i < top.length; ) {
			var candidate = top[i], votes = result[i];
			candidate.votes = votes;
			candidate.vsAll = votes / result[col.NumVoters];
			//candidate.total = total;
		}
		top = sortArrayBy( top, 'votes', { numeric:true } )
			.reverse()
			.slice( 0, max );
		while( top.length  &&  ! top[top.length-1].votes )
			top.pop();
		if( top.length ) {
			var most = top[0].votes;
			for( var i = -1;  ++i < top.length; ) {
				var candidate = top[i];
				candidate.vsTop = candidate.votes / most;
			}
		}
		return top;
	}
	
	function setLegend() {
		$('#legend').html( formatLegend() );
	}
	
	function formatLegend() {
		var topCandidates = topCandidatesByVote(
			totalResults( currentResults() )
		);
		var top = formatLegendTopCandidates( topCandidates.slice( 0, 4 ) );
		var candidates = topCandidates.map( formatLegendCandidate );
		return formatLegendTable( [ top ].concat( candidates ) );
	}
	
	function formatLegendTopCandidates( topCandidates ) {
		var colors = topCandidates.map( function( candidate ) {
			return candidate.color;
		});
		var selected = candidates.current == -1 ? ' selected' : '';
		return S(
			'<td class="legend-candidate', selected, '" id="legend-candidate-top">',
				'<div class="legend-candidate">',
					formatSpanColorPatch( colors, 2 ),
					'&nbsp;',
					//'percentReportingShort'.T({
					//	percent: percent( totalReporting( currentResults() ) )
					//}),
					'allCandidatesShort'.T(),
					'&nbsp;',
				'</div>',
			'</td>'
		);
	}
	
	function formatLegendCandidate( candidate ) {
		var selected = ( candidate.id == candidates.current ) ? ' selected' : '';
		return S(
			'<td class="legend-candidate', selected, '" id="legend-candidate-', candidate.id, '">',
				'<div class="legend-candidate">',
					formatSpanColorPatch( candidate.color, 8 ),
					'&nbsp;', candidate.lastName, '&nbsp;',
					percent( candidate.vsAll ), '&nbsp;',
				'</div>',
			'</td>'
		);
	}
	
	function nameCase( name ) {
		return name && name.split(' ').map( function( word ) {
			return word.slice( 0, 1 ) + word.slice( 1 ).toLowerCase();
		}).join(' ');
	}
	
	function formatTipCandidates( feature, result ) {
		var topCandidates = topCandidatesByVote( result, useSidebar() ? 0 : 4 );
		if( ! topCandidates.length )
			return 'noVotes'.T();
		return S(
			'<table class="candidates" cellpadding="0" cellspacing="0">',
				topCandidates.mapjoin( function( candidate, i ) {
					var pct = percent( candidate.vsAll );
					return S(
						'<tr class="', i ? '' : 'first', '">',
							'<td>',
								'<div style="margin:6px 6px 6px 0;">',
									formatCandidateIcon( candidate, 32 ),
								'</div>',
							'</td>',
							'<td style="padding-right:16px;">',
								'<div class="candidate-name">',
									'<div class="first-name">',
										candidate.firstName,
									'</div>',
									'<div class="last-name" style="font-weight:bold;">',
										candidate.lastName,
									'</div>',
								'</div>',
							'</td>',
							'<td>',
								formatCandidateAreaPatch( candidate, 24 ),
							'</td>',
							web() ? S(
								'<td class="candidate-votes" style="text-align:right; padding-left:6px;">',
									formatNumber( candidate.votes ),
								'</td>'
							) : '',
							'<td class="candidate-percent" style="text-align:right; padding-left:6px;">',
								web() ? S( '(', pct, ')' ) : pct,
							'</td>',
						'</tr>'
					);
				}),
			'</table>'
		);
	}
	
	function formatTip( feature ) {
		if( ! feature ) return null;
		var result = currentResults().rowsByID[feature.id];
		
		var content;
		if( result ) {
			var content = S(
				'<div class="tipcontent">',
					formatTipCandidates( feature, result ),
				'</div>'
			);
			
			var boxes = result[col.NumBallotBoxes];
			var counted = result[col.NumCountedBallotBoxes];
		}
		
		var parent = data.states.geo &&
			data.states.geo.features.by.id[feature.parent];
		
		return S(
			'<div class="tiptitlebar">',
				'<div style="float:left;">',
					'<span class="tiptitletext">',
						feature.name,
						debug ? ' (#' + feature.id + ')' : '',
						' ',
					'</span>',
				'</div>',
				'<div style="clear:left;">',
				'</div>',
				parent ? ' ' + parent.name : '',
				parent && debug ? ' (#' + parent.id + ')' : '',
				'<div class="tipreporting">',
					'percentReporting'.T({
						percent: percent( counted / boxes ),
						counted: counted,
						total: boxes
					}),
				'</div>',
			'</div>',
			content
		);
	}
	
	function moveTip( event ) {
		if( ! tipHtml ) return;
		var x = event.pageX, y = event.pageY;
		if(
			x < mapPixBounds.left  ||
			x >= mapPixBounds.right  ||
			y < mapPixBounds.top  ||
			y >= mapPixBounds.bottom
		) {
			showTip( false );
		}
		x += tipOffset.x;
		y += tipOffset.y;
		var pad = 2;
		var width = $maptip.width(), height = $maptip.height();
		var offsetLeft = width + tipOffset.x * 2;
		var offsetTop = height + tipOffset.y * 2;
		
		if( x + width > ww - pad ) {
			x -= width + pad + tipOffset.x * 2;
		}
		if( x < pad ) {
			x = pad;
		}
		
		if( y + height > wh - pad )
			y -= height + pad + tipOffset.y * 2;
		if( y < pad )
			y = wh - pad - height - tipOffset.y * 2;
		
		$maptip.css({ left:x, top:y });
	}
	
	function formatNumber( nStr ) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	}
	
	function getLeaders( locals ) {
		var leaders = {};
		for( var localname in locals ) {
			var votes = locals[localname].votes[0];
			if( votes ) leaders[votes.name] = true;
		}
		return leaders;
	}
	
	// Separate for speed
	function getLeadersN( locals, n ) {
		var leaders = {};
		for( var localname in locals ) {
			for( var i = 0;  i < n;  ++i ) {
				var votes = locals[localname].votes[i];
				if( votes ) leaders[votes.name] = true;
			}
		}
		return leaders;
	}
	
	function setStateByAbbr( abbr ) {
		setState( states.by.abbr(abbr) );
	}
	
	function setState( state ) {
		if( ! state ) return;
		if( typeof state == 'string' ) state = states.by.abbr( state );
		var select = $('#stateSelector')[0];
		select && ( select.selectedIndex = state.selectorIndex );
		opt.state = state.abbr.toLowerCase();
		geoMoveNext = true;
		setCounties( true );
	}
	
	var mapStyles = [
		{
			featureType: "road",
			elementType: "labels",
			stylers: [ { visibility: "off" } ]
		},{
			featureType: "road",
			elementType: "geometry",
			stylers: [ { saturation: -100 }, { lightness: 50 } ]
		},{
			featureType: "transit",
			elementType: "all",
			stylers: [ { visibility: "off" } ]
		},{
			featureType: "landscape",
			elementType: "all",
			stylers: [ { saturation: -100 }, { lightness: 100 } ]
		},{
			featureType: "administrative",
			elementType: "all",
			stylers: [ { visibility: "off" } ]
		},{
			featureType: "administrative.locality",
			elementType: "labels",
			stylers: [ { visibility: "on" } ]
		}
	];
	
	function initMap() {
		if( map ) return;
		gm = google.maps, gme = gm.event;
		mapPixBounds = $map.bounds();
		var mapopt = $.extend({
			mapTypeId: 'simple',
			streetViewControl: false,
			panControl: false,
			rotateControl: false
		},
		params.play ? {
			mapTypeControl: false,
			zoomControl: false
		} : {
			mapTypeControlOptions: {
				mapTypeIds: []
			},
			zoomControlOptions: {
				style: gm.ZoomControlStyle.SMALL
			}
		});
		map = new gm.Map( $map[0],  mapopt );
		var mapType = new gm.StyledMapType( mapStyles );
		map.mapTypes.set( 'simple', mapType );
		
		//if( ! PolyGonzo.isVML() ) {
		//	gme.addListener( map, 'zoom_changed', function() {
		//		var oldZoom = zoom;
		//		zoom = map.getZoom();
		//		if( zoom > oldZoom  &&  zoom >= 7 )
		//			setCounties( true );
		//		else if( zoom < oldZoom  &&  zoom < 7 )
		//			setCounties( false );
		//	});
		//}
	}
	
	function initSelectors() {
		
		//setStateByAbbr( opt.state );
		
		$('#stateSelector').bindSelector( 'change keyup', function() {
			var value = this.value.replace('!','').toLowerCase();
			if( opt.state == value ) return;
			opt.state = value;
			setCounties( value > 0 );
			var state = data.states.geo.features.by.id[value];
			fitBbox( state ? state.bbox : data.states.geo.bbox );
		});
		
		$('#chkCounties').click( function() {
			setCounties( this.checked );
		});
		
		var $legend = $('#legend');
		$legend.delegate( 'td.legend-candidate', {
			mouseover: function( event ) {
				$(this).addClass( 'hover' );
			},
			mouseout: function( event ) {
				$(this).removeClass( 'hover' );
			},
			click: function( event ) {
				var id = this.id.split('-')[2];
				if( id == 'top' ) id = -1;
				setCandidate( id );
			}
		});
		
		setCandidate = function( id ) {
			candidates.current = id;
			loadView();
		}
	}
	
	function oneshot() {
		var timer;
		return function( fun, time ) {
			clearTimeout( timer );
			timer = setTimeout( fun, time );
		};
	}
	
	function hittest( latlng ) {
	}
	
	function loadView() {
		showTip( false );
		//overlays.clear();
		opt.state = +$('#stateSelector').val();
		//var state = curState = data.states.geo.features.by.abbr[opt.abbr];
		$('#spinner').show();
		loadRegion();
	}
	
	//function getShapes( state, callback ) {
	//	if( state.shapes ) callback();
	//	else getJSON( 'shapes', opt.shapeUrl, state.abbr.toLowerCase() + '.json', 3600, function( shapes ) {
	//		state.shapes = shapes;
	//		//if( state == stateUS ) shapes.features.state.index('state');
	//		callback();
	//	});
	//}
	
	var cacheResults = new Cache;
	
	function getResults() {
		var results = cacheResults.get( opt.counties );
		if( results ) {
			loadResults( results, opt.counties, false );
			return;
		}
		var url = S(
			'http://fusiontables.googleusercontent.com/fusiontables/api/query?',
			'jsonCallback=', opt.counties ? 'loadCounties' : 'loadStates',
			'&_=', Math.floor( now() / opt.resultCacheTime ),
			'&sql=SELECT+',
			resultsFields(),
			'+FROM+',
			//opt.counties ? '2458834' : 'TODO'
			params.tableid || '2458834'
		);
		getScript( url );
	}
	
	function randomizeData( rows) {
		rows.forEach( function( row ) {
			var nVoters = 0;
			var nPrecincts = row[col.NumBallotBoxes];
			var nCounted = row[col.NumCountedBallotBoxes] =
				Math.max( 0,
					Math.min( nPrecincts,
						randomInt( nPrecincts * 2 ) -
						Math.floor( nPrecincts / 2 )
					)
				);
			var total = 0;
			for( iCol = -1;  ++iCol < candidates.length; )
				total += row[iCol] = nCounted ? randomInt(100000) : 0;
			row[col.NumVoters] = total + randomInt(total*2);
		});
	}
	
	loadStates = function( json ) {
		loadResults( json, false, true );
	};
	
	loadCounties = function( json ) {
		fixCountyIDs( json );
		loadResults( json, true, true );
	};
	
	function fixCountyIDs( json ) {
		json.table.rows.forEach( function( row ) {
			var id = row[col.ID];
			if( id.length < 5 ) {
				while( id.length < 3 ) id = '0' + id;
				row[col.ID] = '19' + id;
			}
		});
	}
	
	function loadResults( json, counties, loading ) {
		if( params.randomize ) {
			opt.resultCacheTime = Infinity;
			opt.reloadTime = false;
			clearInterval( reloadTimer );
		}
		if( loading )
			cacheResults.add( counties, json, opt.resultCacheTime );
		var results = currentData().results = json.table;
		var rowsByID = results.rowsByID = {};
		var rows = results.rows;
		if( params.randomize ) {
			randomizeData( rows );
			delete params.randomize;
		}
		for( var row, iRow = -1;  row = rows[++iRow]; ) {
			rowsByID[ row[col.ID] ] = row;
			var nCandidates = candidates.length;
			var max = 0,  candidateMax = -1;
			for( iCol = -1;  ++iCol < nCandidates; ) {
				var count = row[iCol];
				if( count > max ) {
					max = count;
					candidateMax = iCol;
				}
			}
			row.candidateMax = candidateMax;
		}
		if( counties == opt.counties )
			geoReady();
	}
	
	function objToSortedKeys( obj ) {
		var result = [];
		for( var key in obj ) result.push( key );
		return result.sort();
	}
	
	var blank = imgUrl( 'blank.gif' );
	
	$('a.logo').css({ display: 'block' });
	$('body.interactive a.logo')
		.css({ opacity: .5 })
		.mouseover( function() {
			$(this).stop().fadeTo( 250, 1 );
		})
		.mouseout( function() {
			$(this).stop().fadeTo( 500, .5 );
		});
	
	$window.bind( 'load', function() {
		loadView();
	});
	
	// TODO: this should work, but the standard GA script below
	// doesn't seem to work either -  __utm.gif does not get loaded
	//getScript( S(
	//	location.protocol == 'https:' ? 'https://ssl' : 'http://www',
	//	'.google-analytics.com/ga.js'
	//) );

})( jQuery );

(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();
