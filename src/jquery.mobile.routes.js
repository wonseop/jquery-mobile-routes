/*!
 * jQuery mobile routes plugin v0.0.1 - Copyright (c) 2013 Wonseop Kim
 * Released under MIT license
 */

( function ( $, window, undefined ) {
	var document = window.document;

	$.widget( "mobile.routes", $.mobile.widget, {
		options: {
			language: null,
			db: null,
			gridLine: false,
			margin: 10,
			interval: 1,
			initSelector: ":jqmData(role='routes')"
		},

		_svg: null,
		_gridRange: [],
		_data: {},
		_leftTop: [],
		_rightBottom: [],
		_languageData: null,
		_lines: [],
		_stations: [],

		_create: function () {
			var self = this,
				view = self.element,
				svgContainer = $( "<div>" ).appendTo( view );

			svgContainer.addClass( "ui-routes-svg ui-routes-container" ).svg();
			self._svg = svgContainer.svg( "get" );

			view.addClass( "ui-routes" );

			$.each( this.options, function ( key, value ) {
				self.options[ key ] = undefined;
				self._setOption( key, value );
			});

			if ( window.navigator.userAgent.match( /(firefox)\/?\s*(\.?\d+(\.\d+)*)/i ) &&
				document.readyState !== "complete" ) {
				$( window ).on( "pageshow resize", function () {
					self._svg._svg.setAttribute( "width", "100%" );
					self._svg._svg.setAttribute( "height", "100%" );
				});
			} else {
				self.refresh();
			}
		},

		_setOption: function ( key, value ) {
			var self = this,
				option = self.options,
				data;

			$.mobile.widget.prototype._setOption.apply( this, arguments );
			switch ( key ) {
			case "db":
				if ( value.match(/\.(json)$/i) ) {
					$.ajax({
						async: false,
						global: false,
						dataType: 'JSON',
						url : option.db
					}).done( function ( result ) {
						data = result;
					}).fail( function ( e ) {
						throw new Error( e );
					});
				} else {
					data = window[value];
				}
				self._processData( data );
				break;

			case "language":
				data = option.db;
				if ( !data || !data.match(/\.(json)$/i) ) {
					return;
				}
				data = data.substring( data.lastIndexOf("\\") + 1, data.lastIndexOf(".") ) +
						"." + value + "." + data.substring( data.lastIndexOf(".") + 1, data.length );
				$.ajax({
					async: false,
					global: false,
					dataType: 'JSON',
					url : data
				}).done( function ( result ) {
					self._languageData = result;
				});
				break;
			}
		},

		_clear: function () {
			this._svg.clear( true );
		},

		_processData: function ( data ) {
			var i, j, k,
				svg = this._svg,
				lines = data.lines,
				options = this.options,
				interval = options.interval,
				margin = options.margin,
				branches,
				branch,
				station,
				stationStyle,
				stationRadius = data.stationRadius,
				stationFont = data.stationFont,
				exchangeStyle = data.exchangeStyle,
				exchangeRadius = data.exchangeRadius,
				exchangeFont = data.exchangeFont,
				lineStyle,
				coord,
				minX = 9999,
				minY = 9999,
				maxX = 0,
				maxY = 0,
				xPosPrev = -1,
				yPosPrev = -1,
				xPos = 0,
				yPos = 0,
				linePath,
				direction = "h",
				control1,
				control2,
				controlPoint = [],
				convertCoord = function ( pos ) {
					return ( margin + interval * pos );
				};

			this._data = data;

			for ( i = 0; i < lines.length; i += 1 ) {
				branches = lines[i].stations;
				stationStyle = lines[i].style.station;
				lineStyle = lines[i].style.line;
				for ( j = 0; j < branches.length; j += 1 ) {
					branch = branches[j];
					linePath = svg.createPath();
					for ( k = 0; k < branch.length; k += 1 ) {
						station = branch[k];
						coord = station.coordinates;

						// info
						minX = ( minX > coord[0] ) ? coord[0] : minX;
						minY = ( minY > coord[1] ) ? coord[1] : minY;
						maxX = ( maxX < coord[0] ) ? coord[0] : maxX;
						maxY = ( maxY < coord[1] ) ? coord[1] : maxY;

						//stations
						if ( !this._stations[coord[0]] ) {
							this._stations[coord[0]] = [];
						}

						if ( !this._stations[coord[0]][coord[1]] ) {
							station.style = stationStyle;
							station.radius = stationRadius;
							station.font = stationFont;
							if ( this._languageData ) {
								station.label.text =  this._languageData[station.label.text] || station.label.text;
							}
							this._stations[coord[0]][coord[1]] = station;
						} else if ( !this._stations[coord[0]][coord[1]].exchange ) {
							station.style = exchangeStyle;
							station.radius = exchangeRadius;
							station.font = exchangeFont;
							station.exchange = true;
							if ( this._languageData ) {
								station.label.text =  this._languageData[station.label.text] || station.label.text;
							}
							this._stations[coord[0]][coord[1]] = station;
						}

						// lines
						xPos = convertCoord( coord[0] );
						yPos = convertCoord( coord[1] );

						if ( xPosPrev !== -1 && yPosPrev !== -1 ) {
							if ( xPosPrev === xPos || yPosPrev === yPos ) {
								linePath.line( xPos, yPos );
								direction = ( xPosPrev === xPos ) ? "h" : "v";
							} else {
								// Catmull-Rom to Cubic Bezier conversion matrix 
								//    0       1       0       0
								//  -1/6      1      1/6      0
								//    0      1/6      1     -1/6
								//    0       0       1       0
								control1 = branch[ ( k < 2 ) ? ( ( k < 1 ) ? k : ( k - 1 ) ) : ( k - 2 ) ].coordinates;
								control2 = branch[ ( k > branch.length - 2 ) ? k  : ( k + 1 )].coordinates;
								controlPoint[0] = ( -convertCoord( control1[0] ) + 6 * xPosPrev + xPos ) / 6;
								controlPoint[1] = ( -convertCoord( control1[1] ) + 6 * yPosPrev + yPos ) / 6;
								controlPoint[2] = ( xPosPrev + 6 * xPos - convertCoord( control2[0] ) ) / 6;
								controlPoint[3] = ( yPosPrev + 6 * yPos - convertCoord( control2[1] ) ) / 6;

								linePath.curveC( controlPoint[0], controlPoint[1], controlPoint[2], controlPoint[3], xPos, yPos );
							}
						} else {
							linePath.move( xPos, yPos );
						}

						xPosPrev = xPos;
						yPosPrev = yPos;
					}

					this._lines.push( { path: linePath, style: lineStyle } );
					xPosPrev = yPosPrev = -1;
				}
			}
			this._leftTop = [ minX, minY ];
			this._rightBottom = [ maxX, maxY ];

			this.element.find( ".ui-routes-container" )
				.width( ( maxX + minX ) * this.options.interval + this.options.margin * 2 )
				.height( ( maxY + minY ) * this.options.interval + this.options.margin * 2 );
		},

		_drawGrid: function () {
			if ( !this.options.gridLine || !this._data ) {
				return;
			}

			var self = this,
				options = self.options,
				svg = self._svg,
				style = { stroke: 'blue', strokeWidth: 1 },
				interval = options.interval,
				margin = options.margin,
				cw = margin * 2 + interval * ( this._rightBottom[0] + 1 ),
				ch = margin * 2 + interval * ( this._rightBottom[1] + 1 ),
				i;

			for ( i = 0; i <= cw; i += interval ) {
				svg.line( 0.5 + i + margin, margin, 0.5 + i + margin, ch - margin, style );
			}
			for ( i = 0; i <= ch; i += interval ) {
				svg.line( margin, 0.5 + i + margin, cw - margin, 0.5 + i + margin, style );
			}
		},

		_drawLines: function () {
			var i,
				svg = this._svg,
				lines = this._lines;

			for ( i = 0; i < lines.length; i += 1 ) {
				svg.path( null, lines[i].path, lines[i].style );
			}
		},

		_drawElements: function () {
			var i, j,
				svg = this._svg,
				options = this.options,
				interval = options.interval,
				margin = options.margin,
				stationRadius,
				stations = this._stations,
				station,
				label,
				coordinates,
				position,
				labelPosition = [0, 0],
				labelAngle = 0,
				group,
				text;

			for ( i = 0; i <= this._rightBottom[0]; i += 1 ) {
				if ( !stations[i] ) {
					continue;
				}

				for ( j = 0; j <= this._rightBottom[1]; j += 1 ) {
					if ( !stations[i][j] ) {
						continue;
					}

					station = stations[i][j];
					label = station.label;
					coordinates = station.coordinates;
					position = [ margin + interval * coordinates[0], margin + interval * coordinates[1] ];
					stationRadius = station.radius;

					// draw station
					svg.circle( position[0], position[1], stationRadius, station.style );

					group = svg.group();

					labelAngle = ( label.angle ) ? -parseInt( label.angle, 10 ) : 0;

					// draw station name
					text = svg.text( group, label.text || "?",
						{ transform: "rotate(" + labelAngle + ")", fontSize: station.font.fontSize || "9" }
					);

					switch ( label.position || "s" ) {
					case "w" :
						labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius / 2 ];
						break;
					case "e" :
						labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius / 2 ];
						break;
					case "s" :
						labelPosition = [ position[0] - text.getBBox().width / 2, position[1] + stationRadius + text.getBBox().height ];
						break;
					case "n" :
						labelPosition = [ position[0] - text.getBBox().width / 2, position[1] - stationRadius - text.getBBox().height / 3 ];
						break;
					case "nw" :
						labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] - stationRadius / 2 - text.getBBox().height / 3  ];
						break;
					case "ne" :
						labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] - stationRadius / 2 - text.getBBox().height / 3 ];
						break;
					case "sw" :
						labelPosition = [ position[0] - stationRadius * 3 / 2 - text.getBBox().width, position[1] + stationRadius + text.getBBox().height / 2  ];
						break;
					case "se" :
						labelPosition = [ position[0] + stationRadius * 3 / 2, position[1] + stationRadius + text.getBBox().height / 2 ];
						break;
					}

					svg.change( group, { transform: "translate(" + labelPosition[0] + "," + labelPosition[1] + ")" }  );
				}
			}
		},

		refresh: function () {
			var view, svgContainer, svgElement;

			view = this.element;
			svgContainer = view.find( "ui-routes-svg" );
			svgElement = this._svg._svg;

			if ( svgContainer.width() !== view.width() ) {
				svgContainer.width( view.width() );
			}

			this._clear();
			this._drawGrid();
			this._drawLines();
			this._drawElements();
		}
	});

	//auto self-init widgets
	$( document ).on( "pagecreate create", function ( e ) {
		$.mobile.routes.prototype.enhanceWithin( e.target );
	});

	$( window ).on( "pagechange resize", function () {
		$( ".ui-page-active .ui-routes" ).routes( "refresh" );
	});

} ( jQuery, this ) );