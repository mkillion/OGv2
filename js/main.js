
require([
	"dojo/_base/lang",
	"dojo/on",
	"dojo/dom",
    "dojo/window",
    "dojo/_base/array",
    "dojo/store/Memory",
    "dojo/dom-construct",
    "dijit/form/ComboBox",
	"application/Drawer",
    "application/DrawerMenu",
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/TileLayer",
    "esri/layers/MapImageLayer",
    "esri/widgets/Search",
    "esri/widgets/Home",
    "esri/widgets/Locate",
    "esri/PopupTemplate",
    "esri/widgets/Popup",
    "esri/tasks/IdentifyTask",
    "esri/tasks/support/IdentifyParameters",
    "esri/tasks/FindTask",
    "esri/tasks/support/FindParameters",
    "esri/geometry/Point",
    "esri/geometry/SpatialReference",
    "esri/layers/GraphicsLayer",
    "esri/Graphic",
    "esri/tasks/GeometryService",
    "esri/tasks/support/ProjectParameters",
    "esri/geometry/support/webMercatorUtils",
    "esri/layers/ImageryLayer",
	"esri/geometry/geometryEngine",
	"esri/geometry/Polygon",
	"esri/tasks/QueryTask",
	"esri/tasks/support/Query",
	"esri/widgets/ScaleBar",
	"esri/widgets/Legend",
	"esri/layers/support/LabelClass",
	"esri/tasks/support/PrintTemplate",
	"esri/tasks/PrintTask",
	"esri/tasks/support/PrintParameters",
	"esri/tasks/support/LegendLayer",
	"esri/core/watchUtils",
	"esri/widgets/DistanceMeasurement2D",
	"esri/widgets/DistanceMeasurement2D/DistanceMeasurement2DViewModel",
	"esri/widgets/AreaMeasurement2D",
	"esri/widgets/AreaMeasurement2D/AreaMeasurement2DViewModel",
	"esri/widgets/Sketch",
    "dojo/domReady!"
],
function(
	lang,
	on,
	dom,
    win,
    arrayUtils,
    Memory,
    domConstruct,
    ComboBox,
	Drawer,
	DrawerMenu,
    Map,
    MapView,
    TileLayer,
    MapImageLayer,
    Search,
    Home,
    Locate,
    PopupTemplate,
    Popup,
    IdentifyTask,
    IdentifyParameters,
    FindTask,
    FindParameters,
    Point,
    SpatialReference,
    GraphicsLayer,
    Graphic,
    GeometryService,
    ProjectParameters,
    webMercatorUtils,
    ImageryLayer,
	geometryEngine,
	Polygon,
	QueryTask,
	Query,
	ScaleBar,
	Legend,
	LabelClass,
	PrintTemplate,
	PrintTask,
	PrintParameters,
	LegendLayer,
	watchUtils,
	DistanceMeasurement2D,
	DistanceMeasurement2DViewModel,
	AreaMeasurement2D,
	AreaMeasurement2DViewModel,
	Sketch
) {
    var isMobile = WURFL.is_mobile;
	var idDef = [];
	var wmSR = new SpatialReference(3857);
	var urlParams, hilite, bufferGraphic;
	var userDefinedPoint = new Graphic();
	var homeExtent;
	var attrWhere, wwc5GeomWhere, ogGeomWhere, wwc5ComboWhere, ogComboWhere;
	var extentDiv = dom.byId("extentDiv");

    // Set up basic frame:
    window.document.title = "Map of Oil and Gas Data in Kansas";
    $("#title").html("Kansas Oil and Gas<a id='kgs-brand' href='http://www.kgs.ku.edu'>Kansas Geological Survey</a>");

    var showDrawerSize = 850;

	var drawer = new Drawer( {
        showDrawerSize: showDrawerSize,
        borderContainer: "bc_outer",
        contentPaneCenter: "cp_outer_center",
        contentPaneSide: "cp_outer_left",
        toggleButton: "hamburger_button"
    } );
    drawer.startup();

    // Broke the template drawer open/close behavior when paring down the code, so...
    $("#hamburger_button").click(function(e) {
        e.preventDefault();
        if ($("#cp_outer_left").css("width") === "293px") {
            $("#cp_outer_left").css("width", "0px");
        } else {
            $("#cp_outer_left").css("width", "293px");
        }
    } );

    createMenus();
    popCountyDropdown();
	if (!isMobile) {
		$("#from-date").datepicker();
		$("#to-date").datepicker();
		$("#spud-date").datepicker();
	}

    // Combo boxes:
    // /var autocomplete =  (isMobile) ? false : true; // auto-complete doesn't work properly on mobile (gets stuck on a name and won't allow further typing), so turn it off.

	$( "#field-select" ).autocomplete( {
  		source: "getFieldNames.cfm"
	} );

	$( "#well-name" ).autocomplete( {
  		source: "getWellNames.cfm"
	} );

	$( "#lease-name" ).autocomplete( {
  		source: "getLeaseNames.cfm"
	} );

	$( "#curr-op" ).autocomplete( {
  		source: "getOperators.cfm"
	} );

	$( "#curr-lease-op" ).autocomplete( {
  		source: "getLeaseOperators.cfm"
	} );

    // End framework.

    // Create map and map widgets:
    var wwc5GeneralServiceURL = "//services.kgs.ku.edu/arcgis8/rest/services/wwc5/wwc5_v2/MapServer";
	var ogGeneralServiceURL = "//services.kgs.ku.edu/arcgis8/rest/services/oilgas/oilgas_v2/MapServer";
    var identifyTask, identifyParams;
    var findTask = new FindTask(ogGeneralServiceURL);
    var findParams = new FindParameters();
	findParams.returnGeometry = true;

    var basemapLayer = new TileLayer( {url:"//services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer", id:"Base Map"} );
    // var plssLayer = new TileLayer( {url:"//services.kgs.ku.edu/arcgis8/rest/services/plss/plss/MapServer", id:"Section-Township-Range", visible:true} );
	var plssLayer = new TileLayer( {url:"//services.kgs.ku.edu/arcgis8/rest/services/plss/plss_anno_labels/MapServer", id:"Section-Township-Range", visible:true} );
	var topoLayer = new TileLayer( {url:"http://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer", id:"Topography", visible:false} );
	var naip2017Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2017_Color/ImageServer", id:"2017", visible:false} );
	var naip2015Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2015_Color/ImageServer", id:"2015", visible:false} );
	var naip2014Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2014_Color/ImageServer", id:"2014", visible:false} );
	var naip2012Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2012_Color/ImageServer", id:"2012", visible:false} );
	var naip2010Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2010_Color/ImageServer", id:"2010", visible:false} );
	var naip2008Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2008_Color/ImageServer", id:"2008", visible:false} );
	var naip2006Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/FSA_NAIP_2006_Color/ImageServer", id:"2006", visible:false} );
	var doqq2002Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/Kansas_DOQQ_2002/ImageServer", id:"2002", visible:false} );
    var doqq1991Layer = new ImageryLayer( {url:"//services.kgs.ku.edu/arcgis7/rest/services/IMAGERY_STATEWIDE/Kansas_DOQQ_1991/ImageServer", id:"1991", visible:false} );
	// var hroImageryLayer = new ImageryLayer( {url:"//services.kansasgis.org/arcgis7/rest/services/IMAGERY_STATEWIDE/Kansas_HRO_2014_Color/ImageServer", id:"2014 HRO", visible:false} );
	var countyLayer = new MapImageLayer( {url:wwc5GeneralServiceURL, sublayers:[{id:0}], id:"Counties", visible:true} );
	var fieldsLayer = new MapImageLayer( {url:"//services.kgs.ku.edu/arcgis8/rest/services/oilgas/oilgas_fields/MapServer", id:"Oil and Gas Fields", visible:false} );
	// var lpcLayer = new MapImageLayer( {url:"http://kars.ku.edu/arcgis/rest/services/Sgpchat/SouthernGreatPlainsCrucialHabitatAssessmentToolLPCCrucialHabitat/MapServer", id:"LPC Habitat", visible: false} );

	var leasesLayer = new MapImageLayer( {
		url: ogGeneralServiceURL,
		id: "Leases",
		visible: false,
		sublayers: [ {
			id: 6
		} ]
	} );

	var ogLayer = new MapImageLayer( {
		url: ogGeneralServiceURL,
		id: "Oil and Gas Wells",
		visible: true,
		sublayers: [ {
			id: 0,
			// renderer: defaultRenderer,
			labelsVisible: false,
			labelingInfo: [ {
	        	labelExpression: "[API_NUMBER]",
	            labelPlacement: "above-right",
	            symbol: {
	              type: "text",
	              color: [0, 0, 0],
	              haloColor: [255, 255, 255],
	              haloSize: 3,
	              font: {
	                size: 10
	              }
	            },
	            minScale: 500000,
	            maxScale: 0
	        } ]
		} ]
	} );

	// Default WWC5 renderer:
	var defaultWWC5Renderer = {
  		type: "unique-value",
  		field: "TYPE_OF_ACTION_CODE",
		uniqueValueInfos: [
		    {
		    	value: "1",
				label: "Constructed",
			  	symbol: {
					type: "simple-marker",
	  	    		style: "circle",
	  	    		size: 10,
	  	    		color: [0, 0, 255, 0.7]
	  			}
		    }, {
		      value: "2",
			  label: "Reconstructed",
			  symbol: {
				  type: "simple-marker",
				  style: "circle",
				  size: 10,
				  color: [0, 240, 250, 0.7]
			  }
		    }, {
		      value: "3",
			  label: "Plugged",
			  symbol: {
				  type: "simple-marker",
				  style: "circle",
				  size: 10,
				  color: [200, 200, 200, 0.7]
			  }
		    }
		],
		legendOptions: {
			title: "WWC5 Water Wells"
		}
	};

	var wwc5Layer = new MapImageLayer( {
		url: ogGeneralServiceURL,
		id: "WWC5 Water Wells",
		visible: false,
		minScale: 500000,
		maxScale: 0,
		sublayers: [ {
			id: 4,
			renderer: defaultWWC5Renderer,
			labelsVisible: false,
			labelingInfo: [ {
	        	labelExpression: "[OWNER_NAME]",
	            labelPlacement: "above-right",
	            symbol: {
	              type: "text",
	              color: [0, 0, 0],
	              haloColor: [255, 255, 255],
	              haloSize: 3,
	              font: {
	                size: 10
	              }
	            },
	            minScale: 1000000,
	            maxScale: 500
	        } ]
		}
	 	]
	} );

	// Main map:
    var map = new Map( {
        layers: [basemapLayer,
			doqq1991Layer,
			doqq2002Layer,
			naip2006Layer,
			naip2008Layer,
			naip2010Layer,
			naip2012Layer,
			naip2014Layer,
			// hroImageryLayer,
			naip2015Layer,
			naip2017Layer,
			topoLayer,
			// lpcLayer,
			fieldsLayer,
			plssLayer,
			leasesLayer,
			countyLayer,
			wwc5Layer,
			ogLayer]
    } );
	var graphicsLayer = new GraphicsLayer();
    map.add(graphicsLayer);
	var drawingLayer = new GraphicsLayer();
	map.add(drawingLayer);

	// Main view:
    var view = new MapView( {
        map: map,
        container: "mapDiv",
        center: [-98, 38],
        zoom: 7,
        ui: { components: ["zoom"] },
    } );
	view.constraints = {
		rotationEnabled: false
	}

	// Overview map:
	var overviewMap = new Map( {
		basemap: "streets"
	} );

	// Overview map view:
	var ovView = new MapView( {
		map: overviewMap,
		container: "ovmap",
	} );
	ovView.constraints = {
		rotationEnabled: false
	}
	ovView.ui.components = [];
	ovView.on("drag", function(evt) {
  		evt.stopPropagation();
	} );
	ovView.on("key-down", function(evt) {
  		var keyPressed = evt.key;
  		if (keyPressed.slice(0,5) === "Arrow") {
    		evt.stopPropagation();
  		}
	} );

    view.when(function() {
		createTOC();
		createDialogs();
		setTocPrefs();
		setPrefs();

        on(view, "click", executeIdTask);
		on(view, "pointer-move", showCoordinates);

        identifyTask = new IdentifyTask(ogGeneralServiceURL);
        identifyParams = new IdentifyParameters();
		identifyParams.returnGeometry = true;
        identifyParams.tolerance = (isMobile) ? 9 : 4;
        identifyParams.layerIds = [0,6,4,5];
        identifyParams.layerOption = "visible";
        identifyParams.width = view.width;
        identifyParams.height = view.height;

		const sketch = new Sketch( {
			container: "draw-div",
          	layer: drawingLayer,
			layout: "horizontal",
          	view: view
        } );

		sketch.on("create", function(event) {
		 	if (event.state === "complete") {
		    	selectFeatures(event.graphic.geometry);
		  	}
		} );

        // Define additional popup actions:
        // var fullInfoAction = {
        //     title: "View Full KGS Database Record",
        //     id: "full-report",
        //     className: "esri-icon-table pu-icon"
        // };
        // view.popup.actions.push(fullInfoAction);
		//
        // var reportErrorAction = {
        //     title: "Report a Location or Data Problem",
        //     id: "report-error",
        //     className: "esri-icon-contact pu-icon"
        // };
        // view.popup.actions.push(reportErrorAction);
		//
		// var viewScanAction = {
        //     title: "View Scanned WWC5 Form",
        //     id: "wwc5-scan",
        //     className: "esri-icon-documentation pu-icon"
        // };
        // view.popup.actions.push(viewScanAction);

		// Remove zoom-to action that gets added by default:
		view.popup.actions.splice(0, 1);

        // view.popup.on("trigger-action", function(evt) {
        //     if(evt.action.id === "full-report") {
        //         showFullInfo();
        //     } else if (evt.action.id === "report-error") {
        //         $("#prob-dia").dialog("open");
        //     } else if (evt.action.id === "wwc5-scan") {
		// 		showWwc5Scan();
		// 	} else if (evt.action.id === "popup-download") {
		// 		downloadData('p');
		// 	}
        // } );

		view.popup.dockEnabled = true;
		view.popup.dockOptions = {
			buttonEnabled: false,
			position: "auto"
		};

		view.watch("extent", function() {
			localStorage.setItem("kgsog-ext", JSON.stringify(view.extent));
		} );

		view.on("double-click", function(event) {
			graphicsLayer.remove(userDefinedPoint);

			var p = new Point( {
				x: event.mapPoint.x,
				y: event.mapPoint.y,
				spatialReference: wmSR
			 } );

			userDefinedPoint = new Graphic ( {
				geometry: p,
				symbol: {
					type: "simple-marker",
					size: 18,
    				style: "cross",
					outline: {
						type: "simple-line",
						color: [230, 0, 0, 0.7],
						width: 2
					}
				}
			} );

			graphicsLayer.add(userDefinedPoint);
			highlightFeature(userDefinedPoint);
			$(".esri-icon-checkbox-checked").show();
		} );

		$(".esri-icon-home").show();
		$("#ov-icon").show();

		// Kludge:
		setTimeout(function() {
			var nudge = new Point( {x: view.center.x, y: view.center.y + 0.0001, spatialReference: wmSR} );
			view.center = nudge;
		}, 1000);

		urlParams = location.search.substr(1);
	    urlZoom(urlParams);
    } );

	ovView.when(function() {
		// MK: overview map functions modified from ESRI sample. ESRI comments below.
		// Update the overview extent whenever the MapView or SceneView extent changes
        view.watch("extent", updateOverviewExtent);
        ovView.watch("extent", updateOverviewExtent);

        // Update the minimap overview when the main view becomes stationary
        watchUtils.when(view, "stationary", updateOverview);

		function updateOverview() {
            // Animate the MapView to a zoomed-out scale so we get a nice overview.
            // We use the "progress" callback of the goTo promise to update
            // the overview extent while animating
            ovView.goTo({
              center: view.center,
              scale:
                view.scale *
                5 *
                Math.max(
                  view.width / view.width,
                  view.height / view.height
                )
            });
          }

		function updateOverviewExtent() {
		   // Update the overview extent by converting the SceneView extent to the
		   // MapView screen coordinates and updating the extentDiv position.
		   var extent = view.extent;

		   var bottomLeft = ovView.toScreen(
			 new Point({
			   x: extent.xmin,
			   y: extent.ymin,
			   spatialReference: extent.spatialReference
			 })
		   );

		   var topRight = ovView.toScreen(
			 new Point({
			   x: extent.xmax,
			   y: extent.ymax,
			   spatialReference: extent.spatialReference
			 })
		   );

		   extentDiv.style.top = topRight.y + "px";
		   extentDiv.style.left = bottomLeft.x + "px";

		   extentDiv.style.height = bottomLeft.y - topRight.y + "px";
		   extentDiv.style.width = topRight.x - bottomLeft.x + "px";
		 }
	} );

	var searchWidget = new Search({
		view: view,
		popupEnabled: true
	}, "srch" );

 	var scaleBar = new ScaleBar( {
    	view: view,
    	unit: "non-metric"
  	} );
  	view.ui.add(scaleBar, {
    	position: "bottom-left"
  	} );

	var locateBtn = new Locate( {
        view: view,
		container: "locate-btn"
	} );
	if (isMobile) {
		view.ui.add(locateBtn, "top-left");
	} else {
		$(".esri-icon-home").css("top", "164px");
	}

	var distanceWidget = new DistanceMeasurement2D( {
		container: "dist-meas",
		viewModel: {
			mode: "geodesic",
			unit: "us-feet",
			view: view
		}
	} );
	distanceWidget.viewModel.modes.splice(0,2);

	var areaWidget = new AreaMeasurement2D( {
  		container: "area-meas",
		viewModel: {
			mode: "geodesic",
			unit: "square-us-feet",
			view: view
		}
	} );
	areaWidget.viewModel.modes.splice(0,2);

	var legend = new Legend( {
 		view: view,
 	  	layerInfos: [
	 		{
	 			layer: wwc5Layer,
	 			title: " "
	 		},
			{
	 			layer: ogLayer,
	 			title: "Oil and Gas Wells"
	 		},
			{
				layer: leasesLayer,
				title: "Leases"
			}
			// ,
			// {
			// 	layer: lpcLayer,
			// 	title: "Lesser Prairie Chicken Habitat"
			// }
 		]
 	}, "legend-content" );

    // End map and map widgets.

    // Miscellaneous click handlers:
	// Click handler for GoTo and Tools options:
	$(".find-header").click(function() {
		var option = $(this).attr("id");
		if ( $(this).hasClass("esri-icon-down-arrow") ) {
			$("#" + "find-" + option).fadeOut("fast");
		} else {
			$("#" + "find-" + option).fadeIn("fast");
		}
		$(this).toggleClass("esri-icon-down-arrow esri-icon-right-triangle-arrow no-border");
	} );

    $(".esri-icon-erase").click(function() {
		graphicsLayer.removeAll();
		drawingLayer.removeAll();
		clearBuffer();
		clearBufferControls();
		clearOGFilter();
		clearWWC5Filter();
		clearLeaseFilter();
		distanceWidget.viewModel.clearMeasurement();
		areaWidget.viewModel.clearMeasurement();
    } );

	$(".esri-icon-question").click(function() {
		var helpWin = window.open("help.html", "target='_blank'");
    } );

	$(".esri-icon-home").click(function() {
		view.extent = homeExtent;
    } );

	$("#buff-opts-btn").click(function() {
		$("#buff-opts").toggleClass("show");
	} );

	$("#ov-icon").click(function() {
        $("#overviewDiv").toggleClass("ov-open ov-closed");
		$("#ov-icon").toggleClass("esri-icon-overview-arrow-bottom-left esri-icon-overview-arrow-top-right");
    } );


	function selectFeatures(drawGeom) {
		if ( $("#draw-select-chk").is(":checked") ) {
			createWWC5GeomWhere(drawGeom);
			createOGWellsGeomWhere(drawGeom);
			setTimeout(waitForGeomWheres(), 100);
		}
	}


	function showCoordinates(evt) {
		var mapPoint = view.toMap( {x: evt.x, y: evt.y} );
		mapPointGeo = webMercatorUtils.webMercatorToGeographic(mapPoint);
		$("#coords-div").html("<b>" + mapPointGeo.y.toFixed(5) + ", " + mapPointGeo.x.toFixed(5) + " <span style='font-size:10px'>&nbsp;&nbsp;(WGS84)</span></b>");
	}


    function popCountyDropdown() {
        var cntyArr = new Array("Allen", "Anderson", "Atchison", "Barber", "Barton", "Bourbon", "Brown", "Butler", "Chase", "Chautauqua", "Cherokee", "Cheyenne", "Clark", "Clay", "Cloud", "Coffey", "Comanche", "Cowley", "Crawford", "Decatur", "Dickinson", "Doniphan", "Douglas", "Edwards", "Elk", "Ellis", "Ellsworth", "Finney", "Ford", "Franklin", "Geary", "Gove", "Graham", "Grant", "Gray", "Greeley", "Greenwood", "Hamilton", "Harper", "Harvey", "Haskell", "Hodgeman", "Jackson", "Jefferson", "Jewell", "Johnson", "Kearny", "Kingman", "Kiowa", "Labette", "Lane", "Leavenworth", "Lincoln", "Linn", "Logan", "Lyon", "McPherson", "Marion", "Marshall", "Meade", "Miami", "Mitchell", "Montgomery", "Morris", "Morton", "Nemaha", "Neosho", "Ness", "Norton", "Osage", "Osborne", "Ottawa", "Pawnee", "Phillips", "Pottawatomie", "Pratt", "Rawlins", "Reno", "Republic", "Rice", "Riley", "Rooks", "Rush", "Russell", "Saline", "Scott", "Sedgwick", "Seward", "Shawnee", "Sheridan", "Sherman", "Smith", "Stafford", "Stanton", "Stevens", "Sumner", "Thomas", "Trego", "Wabaunsee", "Wallace", "Washington", "Wichita", "Wilson", "Woodson", "Wyandotte");

        for(var i=0; i<cntyArr.length; i++) {
            theCnty = cntyArr[i];
            $("#lstCounty").append("<option value='" + theCnty + "'>" + theCnty + "</option>");
        }
    }


	clearAreaMeasurement = function() {
		areaWidget.viewModel.clearMeasurement();
	}


	clearDistMeasurement = function() {
		distanceWidget.viewModel.clearMeasurement();
	}


	clearDraw = function() {
		drawingLayer.removeAll();
		clearOGFilter();
		clearWWC5Filter();
	}


    function createDialogs() {
		// Report problem dialog:
		var probDia = "<table><tr><td class='find-label'>Message:</td><td><textarea rows='4' cols='25' id='prob-msg' placeholder='Feaature ID is automatically included. Please include email or phone number in case more information is needed.'></textarea></td></tr>";
		probDia += "<tr><td></td><td><button class='find-button' onclick='sendProblem()'>Send</button></td></tr>";
		probDia += "<tr><td colspan='2'><span class='toc-note'>(report website problems or suggestions <a href='mailto:killion@kgs.ku.edu'>here)</a></span></td></tr></table>";

		var problemN = domConstruct.create("div", { id: "prob-dia", class: "filter-dialog", innerHTML: probDia } );
        $("body").append(problemN);

        $("#prob-dia").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Report a location or data error",
			width: 375,
			closeText: ""
        } );

		// Lesser Prairie Chicken disclaimer dialog:
		var lpcDia = "<div>";
		lpcDia += "<p>The Lesser Prairie Chicken (LPC) Crucial Habitat map layer is part of the Southern Great Plains Crucial Habitat Assessment Tool (SGP CHAT), produced and maintained by the Kansas Biological Survey. For more information, including inquiries, please visit the <a href='http://kars.ku.edu/geodata/maps/sgpchat' target='_blank'>project website</a>.</p><p>SGP CHAT is intended to provide useful and non-regulatory information during the early planning stages of development projects, conservation opportunities, and environmental review.</p><p>SGP CHAT is not intended to replace consultation with local, state, or federal agencies.</p><p>The finest data resolution is one square mile hexagons, and use of this data layer at a more localized scale is not appropriate and may lead to inaccurate interpretations. The classification may or may not apply to the entire section. Consult with local biologists for more localized information.</p>";
		lpcDia += "</div>";

		var lpcN = domConstruct.create("div", { id: "lpc-dia", class: "filter-dialog", innerHTML: lpcDia } );
        $("body").append(lpcN);

        $("#lpc-dia").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Disclaimer",
			width: 375,
			closeText: ""
        } );

		// "Not Found" dialog:
		var notFoundDia = "<div>This search did not return any features.<br>Please check your entries and try again.</div>";

		var nfN = domConstruct.create("div", { id: "notfound-dia", class: "filter-dialog", innerHTML: notFoundDia } );
        $("body").append(nfN);

        $("#notfound-dia").dialog( {
            autoOpen: false,
            dialogClass: "dialog",
			title: "Not Found",
			width: 375,
			closeText: ""
        } );
    }


	sendProblem = function() {
		var sfa = view.popup.selectedFeature.attributes;
		if ( sfa.hasOwnProperty("INPUT_SEQ_NUMBER") ) {
			var fId = sfa.INPUT_SEQ_NUMBER;
			var fName = sfa.OWNER_NAME;
			var fType = "wwc5";
			var otherId = "";
		} else if ( sfa.hasOwnProperty("API_NUMBER") ) {
			var fId = sfa.KID;
			var fName = sfa.LEASE_NAME + sfa.WELL_NAME;
			var fType = "ogwell";
			var otherId = "";
		} else if ( sfa.hasOwnProperty("LEASE_NAME") ) {
			var fId = sfa.KID;
			var fName = sfa.LEASE_NAME;
			var fType = "lease";
			var otherId = "";
		} else if ( sfa.hasOwnProperty("FIELD_NAME") ) {
			var fId = sfa.FIELD_KID;
			var fName = sfa.FIELD_NAME;
			var fType = "ogfield";
			var otherId = "";
		}

		$.ajax( {
		  type: "post",
		  url: "reportProblem.cfm",
		  data: {
			  "id": fId,
			  "name": fName,
			  "type": fType,
			  "otherId": otherId,
			  "msg": $("#prob-msg").val()
		  }
		} );
		$("#prob-dia").dialog("close");
	}


	filterLeases = function() {
		var whereClause = "operator_name = '" + $("#curr-lease-op").val() + "'";

		leasesLayer.findSublayerById(6).definitionExpression = whereClause;
		idDef[6] = whereClause;

		view.center = [-98, 39.1];
		view.zoom = 7;
	}


	filterOG = function() {
		attrWhere = "";
		var dateWhere = "";
		var depthWhere= "";
		var spudDate = $("#spud-date").val();
		var compFromDate = $("#from-date").val();
		var compToDate = $("#to-date").val();
		var fromDepth = $("#from-depth").val();
		var toDepth = $("#to-depth").val();
		var currentOperator = $("#curr-op").val();

		if (compFromDate && compToDate) {
			dateWhere = "completion_date >= to_date('" + compFromDate + "','mm/dd/yyyy') and completion_date < to_date('" + compToDate + "','mm/dd/yyyy') + 1";
		} else if (compFromDate && !compToDate) {
			dateWhere = "completion_date >= to_date('" + compFromDate + "','mm/dd/yyyy')";
		} else if (!compFromDate && compToDate) {
			dateWhere = "completion_date < to_date('" + compToDate + "','mm/dd/yyyy') + 1";
		}

		if (fromDepth && toDepth) {
			depthWhere = "rotary_total_depth >= " + fromDepth + " and rotary_total_depth < " + toDepth;
		} else if (fromDepth && !toDepth) {
			depthWhere = "rotary_total_depth >= " + fromDepth;
		} else if (!fromDepth && toDepth) {
			depthWhere = "rotary_total_depth < " + toDepth;
		}

		if (dateWhere !== "") {
			attrWhere += dateWhere + " and ";
		}
		if (depthWhere !== "") {
			attrWhere += depthWhere + " and ";
		}

		if ( $("#chk-scan").is(":checked") ) {
			attrWhere += "kid in (select well_header_kid from elog.scan_urls) and ";
		}
		if ( $("#chk-paper").is(":checked") ) {
			attrWhere += "kid in (select well_header_kid from elog.log_headers) and ";
		}
		if ( $("#chk-las").is(":checked") ) {
			attrWhere += "kid in (select well_header_kid from las.well_headers where proprietary = 0) and ";
		}
		if ( $("#chk-cuttings").is(":checked") ) {
			attrWhere += "kid in (select well_header_kid from cuttings.boxes) and ";
		}
		if ( $("#chk-core").is(":checked") ) {
			attrWhere += "kid in (select well_header_kid from core.core_headers) and ";
		}
		if ( $("#chk-active").is(":checked") ) {
			attrWhere += "status not like '%&A' and status not in ('OTHER', 'LOC') and ";
		}
		if ( $("#chk-horiz").is(":checked") ) {
			attrWhere += "substr(api_workovers, 1, 2) <> '00' and status not in ('LOC') and ";
		}
		if ( $("#chk-spud").is(":checked") ) {
			attrWhere += "spud_date >= to_date('" + spudDate + "','mm/dd/yyyy') and ";
		}
		if (currentOperator) {
			attrWhere += "curr_operator = '" + currentOperator + "' and ";
		}

		if (attrWhere.substr(attrWhere.length - 5) === " and ") {
			attrWhere = attrWhere.slice(0,attrWhere.length - 5);
		}

		applyDefExp();
	}


	bufferFeature = function() {
		graphicsLayer.remove(bufferGraphic);
		clearBuffer();
		var buffDist = dom.byId("buff-dist").value;

		if (view.popup.selectedFeature) {
			if (userDefinedPoint.geometry) {
				createBufferGeom(buffDist, userDefinedPoint.geometry.x, userDefinedPoint.geometry.y);
			} else {
				createBufferGeom(buffDist);
			}
		} else if (userDefinedPoint.geometry) {
			if (view.popup.selectedFeature) {
				createBufferGeom(buffDist);
			} else {
				createBufferGeom(buffDist, userDefinedPoint.geometry.x, userDefinedPoint.geometry.y);
			}
		} else {
			alert("Select a well, point, or address to buffer. Points can be defined by double-clicking on the map.");
		}
	}


	function createBufferGeom(buffDist, x, y) {
		if (x) {
			graphicsLayer.remove(bufferGraphic);
			var theX = x;
			var theY = y;
			var g = "point";
		} else if (view.popup.selectedFeature) {
			graphicsLayer.remove(userDefinedPoint);
			var theX = view.popup.selectedFeature.geometry.x;
			var theY = view.popup.selectedFeature.geometry.y;
			if (view.popup.selectedFeature.geometry.type === "point") {
				var g = "point";
			} else {
				var g = "polygon";
			}
		} else {
			alert("Please select a feature to buffer");
			return;
		}

		if (g === "point") {
			var buffFeature = new Point( {
				x: theX,
				y: theY,
				spatialReference: wmSR
			 } );
		} else {
			var buffFeature = new Polygon( {
				rings: f.geometry.rings,
				spatialReference: wmSR
			 } );
		}

		var buffPoly = geometryEngine.geodesicBuffer(buffFeature, buffDist, dom.byId("buff-units").value);
		var fillSymbol = {
			type: "simple-fill",
			color: [102, 205, 170, 0.25],
			outline: {
				type: "simple-line",
				color: [0, 0, 0],
				width: 1
			}
		};
		bufferGraphic = new Graphic( {
			geometry: buffPoly,
			symbol: fillSymbol
		} );
		graphicsLayer.add(bufferGraphic);
		graphicsLayer.visible = true;

		view.goTo( {
			target: buffPoly.extent,
			scale: 18000
		}, {duration: 500} );

		if ( $("#sel-wwc5-wells").is(":checked") ) {
			createWWC5GeomWhere(buffPoly);
			setTimeout(waitForGeomWheres(), 100);
		}

		if ( $("#sel-og-wells").is(":checked") ) {
			createOGWellsGeomWhere(buffPoly);
			setTimeout(waitForGeomWheres(), 100);
		}
	}


	function createWWC5GeomWhere(geom) {
		var qt = new QueryTask();
		var qry = new Query();
		wwc5GeomWhere = "";

		qt.url = ogGeneralServiceURL + "/4";
		qry.geometry = geom;
		qry.returnGeometry = true;
		qt.executeForIds(qry).then(function(ids) {
			var chunk;
			wwc5GeomWhere = "objectid in";

			while (ids.length > 0) {
				chunk = ids.splice(0,1000);
				chunk = " (" + chunk.join(",") + ") or objectid in";
				wwc5GeomWhere += chunk;
			}

			if (wwc5GeomWhere.substr(wwc5GeomWhere.length - 2) === "in") {
				wwc5GeomWhere = wwc5GeomWhere.slice(0,wwc5GeomWhere.length - 15);
			}
		} );

		return wwc5GeomWhere;
	}


	function createOGWellsGeomWhere(geom) {
		var qt = new QueryTask();
		var qry = new Query();
		ogGeomWhere = "";

		qt.url = ogGeneralServiceURL + "/0";
		qry.geometry = geom;
		qry.returnGeometry = true;
		qt.executeForIds(qry).then(function(ids) {
			var chunk;
			ogGeomWhere = "objectid in";

			while (ids.length > 0) {
				chunk = ids.splice(0,1000);
				chunk = " (" + chunk.join(",") + ") or objectid in";
				ogGeomWhere += chunk;
			}

			if (ogGeomWhere.substr(ogGeomWhere.length - 2) === "in") {
				ogGeomWhere = ogGeomWhere.slice(0,ogGeomWhere.length - 15);
			}
		} );

		return ogGeomWhere;
	}


	function waitForGeomWheres() {
		if (wwc5GeomWhere !== "" && ogGeomWhere !== "") {
			applyDefExp();
		} else {
			setTimeout(waitForGeomWheres, 100);
		}
	}


	function applyDefExp() {
		wwc5ComboWhere = "";
		ogComboWhere = "";

		// WWC5 wells:
		if (wwc5GeomWhere === "clear") {
			// Means form has been reset to defaults.
			wwc5GeomWhere = "";
		}

		if (attrWhere && wwc5GeomWhere) {
			wwc5ComboWhere = attrWhere + " and (" + wwc5GeomWhere + ")";
		}
		if (attrWhere && !wwc5GeomWhere) {
			wwc5ComboWhere = attrWhere;
		}
		if (!attrWhere && wwc5GeomWhere) {
			wwc5ComboWhere = wwc5GeomWhere;
		}
		if (!attrWhere && !wwc5GeomWhere) {
			wwc5ComboWhere = "";
		}

		wwc5Layer.findSublayerById(4).definitionExpression = wwc5ComboWhere;
		idDef[4] = wwc5ComboWhere;

		// OG wells:
		if (ogGeomWhere === "clear") {
			// Means form has been reset to defaults.
			ogGeomWhere = "";
		}

		if (attrWhere && ogGeomWhere) {
			ogComboWhere = attrWhere + " and (" + ogGeomWhere + ")";
		}
		if (attrWhere && !ogGeomWhere) {
			ogComboWhere = attrWhere;
		}
		if (!attrWhere && ogGeomWhere) {
			ogComboWhere = ogGeomWhere;
		}
		if (!attrWhere && !ogGeomWhere) {
			ogComboWhere = "";
		}

		ogLayer.findSublayerById(0).definitionExpression = ogComboWhere;
		idDef[0] = ogComboWhere;

	}


    function openPopup(feature) {
		dom.byId("mapDiv").style.cursor = "auto";
		view.popup.features = feature;
		view.popup.visible = true;
		// if (feature.length > 1) {
		// 	if ( !feature[0].attributes.hasOwnProperty('INPUT_SEQ_NUMBER') ) {
		// 		// ^ don't add download icon to popup if it's a WWC5 well.
		// 		setTimeout(showPuDownloadIcon, 250);
		// 	}
		// }
    }


	function showPuDownloadIcon() {
		$(".esri-popup__pagination-next").append("<span class='esri-icon-download pu-icon' style='margin-left:25px' onclick='downloadData(&quot;p&quot;)' title='Download all oil/gas wells at this point'></span>");
	}


    function urlZoom(urlParams) {
        var items = urlParams.split("&");
        if (items.length > 1) {
            var extType = items[0].substring(2);
            var extValue = items[1].substring(2);

			if (extValue == -999) {
				// Zoom to statewide extent.
				view.center = new Point(-98, 38, new SpatialReference( { wkid: 4326 } ));
				view.zoom = 7;
			} else {
				// Zoom to well.
	            findParams.contains = false;

	            switch (extType) {
					case "well":
						findParams.layerIds = [0];
						findParams.searchFields = ["KID"];
						ogLayer.visible = true;
						$(".toc-label:contains('Oil and Gas Wells')").find("input[type='checkbox']").prop("checked", true);
						break;
					case "field":
						findParams.layerIds = [5];
						findParams.searchFields = ["FIELD_KID"];
						fieldsLayer.visible = true;
						$(".toc-label:contains('Oil and Gas Fields')").find("input[type='checkbox']").prop("checked", true);
						break;
	                case "wwc5":
	                    findParams.layerIds = [4];
	                    findParams.searchFields = ["INPUT_SEQ_NUMBER"];
						wwc5Layer.visible = true;
						$(".toc-label:contains('WWC5 Water Wells')").find("input[type='checkbox']").prop("checked", true);
	                    break;
	            }

	            findParams.searchText = extValue;
	            findTask.execute(findParams)
	            .then(function(response) {
					return addPopupTemplate(response.results);
	            } )
	            .then(function(feature) {
					if (feature.length > 0) {
						openPopup(feature);
		                zoomToFeature(feature);
						homeExtent = view.extent;
					}
	            } );
			}
        } else {
			view.extent = JSON.parse(localStorage.getItem("kgsog-ext"));
			homeExtent = JSON.parse(localStorage.getItem("kgsog-ext"));
		}
    }


    function zoomToFeature(features) {
        var f = features[0] ? features[0] : features;
		if (f.geometry.type === "point") {
            view.center = new Point(f.geometry.x, f.geometry.y, wmSR);
            view.scale = 24000;
		} else {
			view.extent = f.geometry.extent;
			view.zoom = view.zoom - 1;
		}
		highlightFeature(f);
    }


    function highlightFeature(features) {
		graphicsLayer.remove(hilite);
        var f = features[0] ? features[0] : features;
        switch (f.geometry.type) {
            case "point":
                var marker = {
					type: "simple-marker",
                    color: [255, 255, 0, 0],
                    size: 20,
                    outline: {
						type: "simple-line",
                        color: "yellow",
                        width: 7
                    }
                };
				var sym = marker;
                break;
            case "polygon":
				var fill = {
					type: "simple-fill",
					style: "none",
					outline: {
						type: "simple-line",
                        color: "yellow",
                        width: 5
                    }
				};
				var sym = fill;
                break;
        }
		hilite = new Graphic( {
			geometry: f.geometry,
			symbol: sym
		} );
		graphicsLayer.add(hilite);
		graphicsLayer.visible = true;
    }


    jumpFocus = function(nextField,chars,currField) {
        if (dom.byId(currField).value.length == chars) {
            dom.byId(nextField).focus();
        }
    }


    findIt = function(what) {
		searchWidget.clear();
		graphicsLayer.removeAll();
		findParams.contains = false;

        switch (what) {
            case "plss":
                var plssText;

                if (dom.byId("rngdir-e").checked == true) {
                    var dir = 'E';
                }
                else {
                    var dir = 'W';
                }

                if (dom.byId("sec").value !== "") {
                    plssText = "S" + dom.byId("sec").value + "-T" + dom.byId("twn").value + "S-R" + dom.byId("rng").value + dir;
                    findParams.layerIds = [2];
                    findParams.searchFields = ["s_r_t"];
                }
                else {
                    plssText = "T" + dom.byId("twn").value + "S-R" + dom.byId("rng").value + dir;
                    findParams.layerIds = [3];
                    findParams.searchFields = ["t_r"];
                }
                findParams.searchText = plssText;
                break;
            case "county":
                findParams.layerIds = [1];
                findParams.searchFields = ["county"];
                findParams.searchText = dom.byId("lstCounty").value;
                break;
			case "kgsnum":	// WWC5 wells
				findParams.layerIds = [4];
				findParams.searchFields = ["input_seq_number"];
				findParams.searchText = dom.byId("kgs-id-num").value;
				break;
			case "kgskid":	// oilgas wells
				findParams.layerIds = [0];
				findParams.searchFields = ["kid"];
				findParams.searchText = dom.byId("kgs-kid-num").value;
				break;
			case "wellname":
				findParams.layerIds = [0];
				findParams.searchFields = ["well_label"];
				findParams.searchText = dom.byId("well-name").value;
				break;
			case "field":
				findParams.layerIds = [5];
				findParams.searchFields = ["field_name"];
				findParams.searchText = dom.byId("field-select").value;
				fieldsLayer.visible = true;
                $("#Oil-and-Gas-Fields input").prop("checked", true);
				break;
			case "leasename":
				findParams.layerIds = [6];
				findParams.searchFields = ["LEASE_NAME"];
				findParams.searchText = dom.byId("lease-name").value;
				break;
			case "api":
				var stcode = dojo.byId('api_state').value;
				var cocode = dojo.byId('api_county').value;
				var apicode = dojo.byId('api_number').value;

				var qt = new QueryTask( {url:"http://services.kgs.ku.edu/arcgis8/rest/services/oilgas/oilgas_v2/MapServer/0"} );
				var query = new Query();
    			query.returnGeometry = true;
    			query.where = "STATE_CODE = " + stcode + " and COUNTY_CODE = " + cocode + " and API_WELL_NUMBER = " + apicode;
    			query.outFields = ["*"];

    			qt.execute(query).then(function(fset) {
    				if (fset.features.length === 0) {
						$("#notfound-dia").dialog("open");
    				}

					feature = fset.features[0];

					zoomToFeature(feature);
					return addPopupTemplate(fset.features);
				} ).then(function(feature) {
					openPopup(feature);
				} );

			break;
        }
        findTask.execute(findParams).then(function(response) {
            zoomToFeature(response.results[0].feature);
			return addPopupTemplate(response.results);
        } ).then(function(feature) {
			if (what === "kgsnum" || what === "field" || what === "kgskid" || what === "wellname" || what === "leasename") {
				openPopup(feature);
			}
		} );
    }


	function sortList(a, b) {
		var att =  (a.attributes.API_NUMBER) ? "API_NUMBER" : "OWNER_NAME";
        var numA = a.attributes[att];
        var numB = b.attributes[att];
        if (numA < numB) { return -1 }
        if (numA > numB) { return 1 }
        return 0;
    }


	downloadList = function(evt) {
		$("#loader").show();

		var plssStr = "";
		var data = {};

		if (evt.data.cf.sec) {
			plssStr += "twn=" + evt.data.cf.twn + "&rng=" + evt.data.cf.rng + "&dir=" + evt.data.cf.dir + "&sec=" + evt.data.cf.sec + "&type=" + evt.data.cf.type;
		} else if (evt.data.cf.twn) {
			plssStr += "twn=" + evt.data.cf.twn + "&rng=" + evt.data.cf.rng + "&dir=" + evt.data.cf.dir + "&type=" + evt.data.cf.type;
		} else {
			// Download from buffer.
			data = {"type": evt.data.cf.type, "apis": evt.data.cf.apis, "seqs": evt.data.cf.seqs};
		}

		$.post( "downloadPointsInPoly.cfm?" + plssStr, data, function(response) {
			$(".download-link").html(response);
			$("#loader").hide();
		} );
	}


	printMap = function() {
		$("#loader3").show();
		$("#print-link").html("");

		var printTask = new PrintTask( {url: "https://services.kgs.ku.edu/arcgis8/rest/services/util/ExportWebMap/GPServer/Export%20Web%20Map"} );

		// if ( $("#incl-legend").is(":checked") ) {
		// 	var legLyrs = new LegendLayer( {layerId: "Oil and Gas Wells"} );
		// 	var legendLyrs = [legLyrs];
		// 	var legendTitle = "Oil and Gas Wells";
		// } else {
		// 	console.log("no legend");
		// 	var legendLyrs = [];
		// 	var legendTitle = "";
		// }

		var template = new PrintTemplate( {
			format: dom.byId("file-format").value,
		 	exportOptions: {
		   		dpi: 300
		 	},
		 	layout: dom.byId("page-setup").value,
		 	layoutOptions: {
		   		titleText: dom.byId("map-title").value,
		   		authorText: "Kansas Geological Survey - https://maps.kgs.ku.edu/oilgas",
				scalebarUnit: "Miles"
				// legendLayers: legendLyrs,
				// copyrightText: legendTitle	// Highjacking this text element to display legend title info (in custom templates - Templates_Custom folder).
		 	}
		} );

		var params = new PrintParameters( {
		 	view: view,
		 	template: template,
			outSpatialReference: new SpatialReference( {wkid:26914 } )
		} );

		printTask.execute(params).then(function(response) {
			console.log(response);
			var printLink = "<a class='download-link' target='_blank' href='" + response.url + "'><span class='esri-icon-download'></span>Open Map File</a>";
			$("#print-link").html(printLink);
			$("#loader3").hide();
		} );
	}


	zoomToLatLong = function() {
		graphicsLayer.removeAll();

        var lat = dom.byId("lat").value;
        var lon = dom.byId("lon").value;
        var datum = dom.byId("datum").value;

        var gsvc = new GeometryService("//services.kgs.ku.edu/arcgis8/rest/services/Utilities/Geometry/GeometryServer");
        var params = new ProjectParameters();
        var wgs84Sr = new SpatialReference( { wkid: 4326 } );

		switch (datum) {
			case "nad27":
				var srId = 4267;
				break;
			case "nad83":
				var srId = 4269;
				break;
			case "wgs84":
				var srId = 4326;
				break;
		}

        var p = new Point(lon, lat, new SpatialReference( { wkid: srId } ) );
        params.geometries = [p];
        params.outSR = wgs84Sr;

        gsvc.project(params).then( function(features) {
            var pt84 = new Point(features[0].x, features[0].y, wgs84Sr);
            var wmPt = webMercatorUtils.geographicToWebMercator(pt84);

            var ptSymbol = {
				type: "simple-marker",
                style: "cross",
                size: 18,
                outline: {
					type: "simple-line",
                  	color: [255, 0, 0],
                  	width: 2
                }
            };

			userDefinedPoint = new Graphic ( {
				geometry: wmPt,
				symbol: {
					type: "simple-marker",
					size: 18,
    				style: "cross",
					outline: {
						type: "simple-line",
						color: [230, 0, 0, 0.7],
						width: 2
					}
				}
			} );

			view.goTo( {
				target: wmPt,
				zoom: 14
			}, {duration: 750} ).then(function() {
				graphicsLayer.add(userDefinedPoint);
			} );
        } );
    }


	resetFinds = function() {
		searchWidget.clear();
		$("#twn, #rng, #sec, #datum, #lstCounty").prop("selectedIndex", 0);
		$("#rngdir-w").prop("checked", "checked");
		$("[name=welltype]").filter("[value='none']").prop("checked",true);
		$("#api_state, #api_county, #api_number, #api_extension, #well-name, #lease-name, #lat, #lon, #field-select, #kgs-kid-num, #kgs-id-num").val("");
	}


	addBookmark = function() {
		var bName = $("#bkmrk-name").val();
		var keyName = "kgsog-bm-" + bName.replace(/ /g, "xx");
		var keyName = keyName.replace(/'/g, "yyy");
		localStorage.setItem(keyName, JSON.stringify(view.extent));

		var link = "<div class='bookmark-link' id='" + keyName + "'><span class='esri-icon-map-pin'></span><span class='b-name' onclick='goToBookmark(&quot;" + keyName + "&quot;)'>" + bName + "</span><span class='esri-icon-minus-circled' title='Delete Bookmark' onclick='deleteBookmark(&quot;" + keyName + "&quot;)'></span></div>";
		$("#bookmark-links").append(link);
	}


	goToBookmark = function(key) {
		var ext = JSON.parse(localStorage.getItem(key));
		view.extent = ext;
	}


	deleteBookmark = function(key) {
		$("#" + key).remove();
		localStorage.removeItem(key);
	}


    function createMenus() {
    	var drawerMenus = [];
        var content, menuObj;

		// Display panel:
        content = "";
        content += "<div class='panel-container'>";
        content += "<div class='panel-header'>Display* <span class='esri-icon-erase' title='Clear filters, buffers, graphics, and selected wells'></span><span class='esri-icon-question' title='Help'></span></div>";
        content += "<div id='lyrs-toc'></div>";
        content += "</div>";

        menuObj = {
            label: "<div class='icon-layers'></div><div class='icon-text'>Display</div>",
            content: content
        };
        drawerMenus.push(menuObj);

        // Find panel:
        content = "";
        content += "<div class='panel-container'>";
        content += "<div class='panel-header'>Go To <span id='reset-finds'><button onclick='resetFinds()'>Reset</button></span><span class='esri-icon-erase' title='Clear filters, buffers, graphics, and selected wells'></span></span><span class='esri-icon-question' title='Help'></span></div>";
        content += "<div class='panel-padding'>";
        // address:
        content += "<div class='find-header esri-icon-right-triangle-arrow' id='address'><span class='find-hdr-txt'> Address or Place<span></div>";
        content += "<div class='find-body hide' id='find-address'>";
        content += "<div id='srch'></div>";
        content += "</div>";
        // plss:
        content += "<div class='find-header esri-icon-right-triangle-arrow' id='plss'><span class='find-hdr-txt'> Section-Township-Range</span></div>";
        content += "<div class='find-body hide' id='find-plss'>";
        content += "<table><tr><td class='find-label'>Township:</td><td><select id='twn'><option value=''></option>";
        for (var i=1; i<36; i++) {
            content += "<option value='" + i + "'>" + i + "</option>";
        }
        content += "</select> South</td></tr>";
        content += "<tr><td class='find-label'>Range:</td><td style='white-space: nowrap'><select id='rng'><option value=''></option>";
        for (var i=1; i<44; i++) {
            content += "<option value='" + i + "'>" + i + "</option>";
        }
        content += "</select> East: <input type='radio' name='rngdir' id='rngdir-e' value='e'> West: <input type='radio' name='rngdir' id='rngdir-w' value='w' checked></td></tr>";
        content += "<tr><td class='find-label'>Section:</td><td><select id='sec'><option value=''></option>";
        for (var i=1; i<37; i++) {
            content += "<option value='" + i + "'>" + i + "</option>";
        }
        content += "</select><span class='toc-note'>(optional)</td></tr>";
        content += "<tr><td></td><td><button class='find-button' onclick=findIt('plss')>Find</button></td></tr>";
        content += "</table></div>";
		// API NUMBER:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='apinum'><span class='find-hdr-txt'> Well API Number</span></div>";
        content += "<div class='find-body hide' id='find-apinum'>";
        content += "API Number: <span class='note'>(extension optional)</span><br><input type='text' id='api_state' size='2' onKeyUp='jumpFocus(&quot;api_county&quot;, 2, this.id)' value='15'/> - ";
    	content += "<input type='text' id='api_county' size='3' onKeyUp='jumpFocus(&quot;api_number&quot;, 3, this.id)' /> - ";
        content += "<input type='text' id='api_number' size='5' onKeyUp='jumpFocus(&quot;api_extension&quot;, 5, this.id)' /> - ";
    	content += "<input type='text' id='api_extension' size='4' />";
		content += "<button class='find-button' onclick=findIt('api')>Find</button>";
        content += "</div>";
		// WELL NAME:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='wellname'><span class='find-hdr-txt'> Well Name</span></div>";
        content += "<div class='find-body hide' id='find-wellname'>";
        content += "Well Name: <input type='text' id='well-name' size='18'><br>";
		content += "<button class='find-button' onclick=findIt('wellname')>Find</button>";
        content += "</div>";
		// LEASE NAME:
		// content += "<div class='find-header esri-icon-right-triangle-arrow' id='leasename'><span class='find-hdr-txt'> Lease Name</span></div>";
        // content += "<div class='find-body hide' id='find-leasename'>";
        // content += "Lease Name: <input type='text' id='lease-name' size='18'><br>";
		// content += "<button class='find-button' onclick=findIt('leasename')>Find</button>";
        // content += "</div>";
		// FIELD:
        content += '<div class="find-header esri-icon-right-triangle-arrow" id="field"><span class="find-hdr-txt"> Field Name</span></div>';
        content += '<div class="find-body hide" id="find-field">';
        content += 'Field Name: <input id="field-select" size="18">';
		content += '<button class=find-button onclick=findIt("field")>Find</button>';
        content += '</div>';
		// KGS OG WELL KID:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='kgskid'><span class='find-hdr-txt'> KGS Well KID Number</span></div>";
        content += "<div class='find-body hide' id='find-kgskid'>";
        content += "KGS KID Number: <input type='text' id='kgs-kid-num' size='12' />";
		content += "<button class='find-button' onclick=findIt('kgskid')>Find</button>";
        content += "</div>";
		// KGS WWC5 ID:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='kgsid'><span class='find-hdr-txt'> KGS Water Well ID Number</span></div>";
        content += "<div class='find-body hide' id='find-kgsid'>";
        content += "KGS WWC5 ID Number: <input type='text' id='kgs-id-num' size='8' />";
		content += "<button class='find-button' onclick=findIt('kgsnum')>Find</button>";
        content += "</div>";
        // lat-lon:
        content += "<div class='find-header esri-icon-right-triangle-arrow' id='latlon'><span class='find-hdr-txt'> Latitude-Longitude</span></div>";
        content += "<div class='find-body hide' id='find-latlon'>";
        content += "<table><tr><td class='find-label'>Latitude:</td><td><input type='text' id='lat' size='14' placeholder='e.g. 38.12345'></td></tr>";
        content += "<tr><td class='find-label'>Longitude:</td><td><input type='text' id='lon' size='14' placeholder='e.g. -98.12345'></td></tr>";
        content += "<tr><td class='find-label'>Datum:</td><td><select id='datum'><option value='nad27'>NAD27</option><option value='nad83'>NAD83</option><option value='wgs84'>WGS84</option><td></td></tr>";
        content += "<tr><td></td><td><button class='find-button' onclick='zoomToLatLong()'>Find</button></td></tr>";
        content += "</table></div>";
        // county:
        content += "<div class='find-header esri-icon-right-triangle-arrow' id='county'><span class='find-hdr-txt'> County</span></div>";
        content += "<div class='find-body hide' id='find-county'>";
        content += "<table><tr><td class='find-label'>County:</td><td><select id='lstCounty'></select></td><td><button class='find-button' onclick=findIt('county')>Find</button></td></tr></table>";
        content += "</div>";
		// bookmarks
		content += "<div class='panel-sub-txt'>Bookmarks </div>";
		content += "<div id='add-new-bkmrk'> Name: <input type='text' id='bkmrk-name' size='16'><button class='find-button' onclick='addBookmark()'>Add</button></div>";
		content += "<div id='bookmark-links'></div>";
        content += "</div>";
        content += "</div>";

        menuObj = {
            label: "<div class='icon-zoom-in'></div><div class='icon-text'>Go To</div>",
            content: content
        };
        drawerMenus.push(menuObj);


        // Tools panel:
        content = "";
        content += "<div class='panel-container' id='tools-panel'>";
        content += "<div class='panel-header'>Tools <img id='loader' class='hide' src='images/ajax-loader.gif'><span class='esri-icon-erase' title='Clear filters, buffers, graphics, and selected wells'></span></span><span class='esri-icon-question' title='Help'></span></div>";
        content += "<div class='panel-padding'>";
		// FILTER WELLS:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='filter-tool'><span class='find-hdr-txt tools-txt'> Filter Oil and Gas Wells</span></div>";
		content += "<div class='find-body hide' id='find-filter-tool'>";
		content += "<table><tr><td><span class='note'>Filters can be combined</span></td></tr>";
		content += "<tr><td colspan='2'>Show Only:</td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-scan'><span class='filter-tbl'>Wells with Scanned E-Logs</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-paper'><span class='filter-tbl'>Wells with Paper E-Logs</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-las'><span class='filter-tbl'>Wells with LAS Files</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-cuttings'><span class='filter-tbl'>Wells with Rotary Cuttings</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-core'><span class='filter-tbl'>Wells with Core Samples</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-active'><span class='filter-tbl'>Active Wells</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-horiz'><span class='filter-tbl'>Horizontal Wells</span></label></td></tr>";
		content += "<tr><td><label><input type='checkbox' class='filter-chk' id='chk-spud'.<span class='filter-tbl'>Spudded since: </span><label><input id='spud-date' size='10'></td></tr>";
		content += "<tr><td colspan='2'>Completion Date:</td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick' id='date-f'>From: <input type='text' size='14' id='from-date' placeholder='mm/dd/yyyy'></span></td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick' id='date-t'>To: <input type='text' size='14' id='to-date' placeholder='mm/dd/yyyy'></span></td></tr>";
		content += "<tr><td colspan='2'>Total Depth (ft):</td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick' id='depth-f'>From: <input type='text' size='14' id='from-depth'></span></td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick' id='depth-t'>To: <input type='text' size='14' id='to-depth'></span></td></tr>";
		content += "<tr><td colspan='2'>Current Operator:</td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick'>Name: <input type='text' size='20' id='curr-op'></span></td></tr>";
		content += "<tr><td><button class='find-button' onclick='filterOG()'>Apply Filter</button><button class='find-button' onclick='clearOGFilter()'>Reset</button></td></tr></table>";
		content += "</div>";	// end filter div.
		// FILTER LEASES:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='filter-leases-tool'><span class='find-hdr-txt tools-txt'> Filter Leases</span></div>";
		content += "<div class='find-body hide' id='find-filter-leases-tool'>";
		content += "<table>";
		content += "<tr><td colspan='2'>Current Operator:</td></tr>";
		content += "<tr><td colspan='2'><span class='date-pick'>Name: </td></tr>";
		content += "<tr><td colspan='2'><input type='text' size='28' id='curr-lease-op'></span></td></tr>";
		// content += "<tr><td colspan='2'><span class='date-pick'>Year: <input type='text' size='8' id='lease-year' placeholder='yyyy'></span></td></tr>";
		content += "<tr><td><button class='find-button' onclick='filterLeases()'>Apply Filter</button><button class='find-button' onclick='clearLeaseFilter()'>Reset</button></td></tr></table>";
		content += "</div>";	// end filter leases div.
		// buffer:
        content += "<div class='find-header esri-icon-right-triangle-arrow' id='buff-tool'><span class='find-hdr-txt tools-txt'> Buffer / Radius</span></div>";
		content += "<div class='find-body hide' id='find-buff-tool'>";
		var units = ["feet","yards","meters","kilometers","miles"];
		content += "<table><tr><td>Distance: <input type='text' size='6' class='buff-input' id='buff-dist'></td></tr>";
		content += "<tr><td>Units: <select class='buff-input' id='buff-units'>";
		for (var j = 0; j < units.length; j++) {
			content += "<option value='" + units[j] + "'>" + units[j] + "</option>";
		}
		content += "</select></td></tr>";
		content += "<tr><td colspan='2'>Select<span class='note'>(optional)</span>:</td></tr>";
		content += "<tr><td colspan='2'><input type='checkbox' class='buff-input' id='sel-og-wells'>Oil and gas wells inside buffer</td></tr>";
		content += "<tr><td colspan='2'><input type='checkbox' class='buff-input' id='sel-wwc5-wells'>Water wells inside buffer</td></tr>";
		content += "<tr><td colspan='2'><button class='find-button' onclick='bufferFeature()'>Create Buffer</button><button class='find-button' onclick='clearBuffer();clearBufferControls();'>Reset</button></td></tr></table>";
		content += "<span class='note'>Create a point to buffer by either:<ul><li>Selecting a well, or</li><li>Double-clicking on the map, or</li><li>Searching for an adress</li></ul></span>";
		content += "</div>";	// end buffer div.
		// Download:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='download-tool'><span class='find-hdr-txt tools-txt'> Download Oil and Gas Well Data</span></div>";
		content += "<div class='find-body hide' id='find-download-tool'>";
		content += "<div class='note'><ul><li>Creates comma-delimited text files with well, tops, log, LAS, cuttings, and core information for wells visible in the current map extent.</li>";
        content += "<li>If a filter is in effect, the download will also be filtered.</li>";
		content += "<li>To download a shapefile of all oil and gas wells, visit the <a href='http://www.kgs.ku.edu/PRS/petroDB.html' target='_blank'>Oil and Gas Database page.</a>.</li></ul></div>";
		// content += "<table><tr><td>Include:</td></tr>";
		// content += "<tr><td><input type='checkbox' class='buff-input' id='download-og-chk' checked> Oil and gas well data</td></tr>";
		// content += "<tr><td><input type='checkbox' class='buff-input' id='download-wwc5-chk'> WWC5 water well data</td></tr></table>";
		content += "<div><button class='find-button' onclick='downloadData(&quot;d&quot;)'>Create CSV Files</button><img id='loader2' class='hide' src='images/ajax-loader.gif'></div>";
		content += "<div class='download-link' id='wells-link'></div>";
		content += "</div>";	// end download div.
		// Draw-Select:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='draw-tool'><span class='find-hdr-txt tools-txt'> Draw</span></div>";
		content += "<div class='find-body hide' id='find-draw-tool'>";
		content += "<div><input type='checkbox' id='draw-select-chk'> Select wells <span class='note'>(check box first, then draw)</span></div>";
		content += "<div id='draw-div'></div>";
		content += "<button class='find-button clear-draw-btn' onclick='clearDraw();'>Clear</button>";
		content += "</div>";	// end draw-select div.

		// Label:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='label-tool'><span class='find-hdr-txt tools-txt'> Label Oil and Gas Wells</span></div>";
		content += "<div class='find-body hide' id='find-label-tool'>";
		content += "<table><tr><td colspan='2'>Label wells by:</td></tr>";
		content += "<tr><td><label><input type='radio' name='labelname' value='API_NUMBER'> API Number</label></td></tr>";
		content += "<tr><td><label><input type='radio' name='labelname' value='WELL_LABEL'> Well Name</label></td></tr>";
		content += "<tr><td><label><input type='radio' name='labelname' value='PRODUCING_FORMATION'> Producing Formation</label></td></tr>";
		content += "<tr><td><label><input type='radio' name='labelname' value='COMPLETION_YEAR'> Year of Completion</label></td></tr>";
		content += "<tr><td><label><input type='radio' name='labelname' value='none' checked> No Labels</label></td></tr></table>";
		content += "</div>";	// end label div.

		// Area and distance:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='meas-tool'><span class='find-hdr-txt tools-txt'> Measure Area and Distance</span></div>";
		content += "<div class='find-body hide' id='find-meas-tool'>";
		content += "<div>Area</div>";
		content += "<div id='area-meas'></div>";
		content += "<button class='find-button clear-meas-btn' onclick='clearAreaMeasurement()'>Clear Area Measurement</button>";
		content += "<div><hr></div>";
		content += "<div>Distance</div>";
		content += "<div id='dist-meas'></div>";
		content += "<button class='find-button clear-meas-btn' onclick='clearDistMeasurement()'>Clear Distance Measurement</button>";
		content += "</div>";

		// Print/save:
		content += "<div class='find-header esri-icon-right-triangle-arrow' id='print-tool'><span class='find-hdr-txt tools-txt'> Print / Save Map</span></div>";
		content += "<div class='find-body hide' id='find-print-tool'>";
		content += "<div class='print-ui'>Title<br><input type='text' size='28' id='map-title' placeholder='optional'></div>";
		content += "<div class='print-ui'>Page setup<br><select id='page-setup'>";
		content += "<option value='letter-ansi-a-landscape'>Letter ANSI A Landscape</option>";
		content += "<option value='letter-ansi-a-portrait'>Letter ANSI A Portrait</option>";
		// content += "<option value='tabloid-ansi-b-landscape'>Tabloid ANSI B Landscape</option>";
		// content += "<option value='tabloid-ansi-b-portrait'>Tabloid ANSI B Portrait</option>";
		// content += "<option value='map-only'>Map Only</option>";
		content += "</select></div>";
		content += "<div class='print-ui'>File format<br><select id='file-format'>";
		content += "<option value='pdf'>PDF</option>";
		content += "<option value='png32'>PNG32</option>";
		content += "<option value='png8'>PNG8</option>";
		content += "<option value='jpg'>JPG</option>";
		content += "<option value='gif'>GIF</option>";
		// content += "<option value='eps'>EPS</option>";
		// content += "<option value='svg'>SVG</option>";
		// content += "<option value='svgz'>SVGZ</option>";
		content += "</select></div>";
		// content += "<div class='print-ui'><input type='checkbox' id='incl-legend' checked>Include legend</div>";
		content += "<div class='print-ui'><button id='print-btn' class='find-button' onclick='printMap()'>Print / Save</button><img id='loader3' class='hide' src='images/ajax-loader.gif'>";
		content += "<div id='print-link'></div>";
		content += '</div></div>';	// end print div.

        menuObj = {
            label: "<div class='icon-wrench'></div><div class='icon-text'>Tools</div>",
            content: content
        };
        drawerMenus.push(menuObj);

		// Legend/links panel:
        content = "";
        content += "<div class='panel-container'>";
		content += "<div class='panel-header'>Links <span class='esri-icon-erase' title='Clear filters, buffers, graphics, and selected wells'></span></span><span class='esri-icon-question' title='Help'></span></div>";
		content += "<div>";
		content += "<a href='http://www.kgs.ku.edu' target='_blank'>KGS Home Page</a><p>";
		content += "<a href='http://www.kgs.ku.edu/PRS/petroDB.html' target='_blank'>KGS Oil and Gas Database</a><p>";
		content += "<a href='https://maps.kgs.ku.edu/wwc5' target='_blank'>KGS WWC5 Water Well Mapper</a><p>";
		content += "<a href='https://pubs.usgs.gov/gip/TopographicMapSymbols/topomapsymbols.pdf' target='_blank'>Topographic Map Symbols</a><p>";
		content += "</div>";
        content += "<div class='panel-header'>Legend </div>";
        content += "<div class='panel-padding'>";
        content += "<div id='legend-content'></div>";
        content += "</div>";
        content += "</div>";

        menuObj = {
            label: "<div class='icon-list'></div><div class='icon-text'>Links/Legend</div>",
            content: content
        };
        drawerMenus.push(menuObj);

        var drawerMenu = new DrawerMenu({
            menus: drawerMenus
        }, dom.byId("drawer_menus"));
        drawerMenu.startup();

		// Click handlers:
		$("input[name='ct']").change(function() {
			classifyWells();
		} );

		$("input[name='labelname']").change(function() {
			labelWells();
		} );
    }

	clearOGFilter = function() {
		$(".filter-chk").removeAttr("checked");
		$("#from-date, #to-date, #spud-date, #curr-op, #from-depth, #to-depth").val("");
		attrWhere = "";
		comboWhere = "";
		ogLayer.findSublayerById(0).definitionExpression = "";
		idDef[0] = "";
		identifyParams.layerDefinitions = idDef;
	}


	clearLeaseFilter = function() {
		$("#curr-lease-op").val("");
		leasesLayer.findSublayerById(6).definitionExpression = "";
		idDef[6] = "";
	}


	clearWWC5Filter = function() {
		// $(".filter-chk").removeAttr("checked");
		// $("#from-date, #to-date, #spud-date, #from-depth, #to-depth").val("");
		attrWhere = "";
		comboWhere = "";
		wwc5Layer.findSublayerById(4).definitionExpression = "";
		idDef[4] = "";
		identifyParams.layerDefinitions = idDef;
	}


	clearBuffer = function() {
		wwc5GeomWhere = "clear";
		ogGeomWhere = "clear";
		wwc5Layer.findSublayerById(4).definitionExpression = "";
		idDef[4] = "";
		ogLayer.findSublayerById(0).definitionExpression = "";
		idDef[0] = "";
		identifyParams.layerDefinitions = idDef;
		graphicsLayer.removeAll();
	}


	clearBufferControls = function() {
		$("#sel-wwc5-wells").removeAttr("checked");
		$("#sel-og-wells").removeAttr("checked");
		$("#buff-dist").val("");
		$("#buff-units").prop("selectedIndex",0);
	}


	// classifyWells = function() {
	// 	// NOTE: using a "swap layers" technique instead of renderers due to a bug in renderer (at 4.7).
	// 	var classificationType = $("input[name='ct']:checked").val();
	//
	// 	var defaultLyr = wwc5Layer.findSublayerById(3);
	// 	var depthLyr = wwc5Layer.findSublayerById(12);
	// 	var levelLyr = wwc5Layer.findSublayerById(13);
	// 	var yieldLyr = wwc5Layer.findSublayerById(14);
	// 	var typeLyr = wwc5Layer.findSublayerById(15);
	//
	// 	switch (classificationType) {
	// 		case "yld":
	// 			defaultLyr.visible = false;
	// 			depthLyr.visible = false;
	// 			levelLyr.visible = false;
	// 			yieldLyr.visible = true;
	// 			typeLyr.visible = false;
	// 			break;
	// 		case "dpth":
	// 			defaultLyr.visible = false;
	// 			depthLyr.visible = true;
	// 			levelLyr.visible = false;
	// 			yieldLyr.visible = false;
	// 			typeLyr.visible = false;
	// 			break;
	// 		case "lvl":
	// 			defaultLyr.visible = false;
	// 			depthLyr.visible = false;
	// 			levelLyr.visible = true;
	// 			yieldLyr.visible = false;
	// 			typeLyr.visible = false;
	// 			break;
	// 		case "type":
	// 			defaultLyr.visible = false;
	// 			depthLyr.visible = false;
	// 			levelLyr.visible = false;
	// 			yieldLyr.visible = false;
	// 			typeLyr.visible = true;
	// 			break;
	// 		case "none":
	// 			defaultLyr.visible = true;
	// 			depthLyr.visible = false;
	// 			levelLyr.visible = false;
	// 			yieldLyr.visible = false;
	// 			typeLyr.visible = false;
	// 			break;
	// 	}
	//
	// 	labelWells();
	//
	// 	// Save setting:
	// 	localStorage.setItem("kgsog_classification", classificationType);
	// }


    showFullInfo = function(type) {
		switch (type) {
			case "ogwell":
				var url = "http://chasm.kgs.ku.edu/apex/qualified.well_page.DisplayWell?f_kid=" + $("#well-kid").html();
				break;
			case "field":
				var url = "https://chasm.kgs.ku.edu/ords/oil.ogf4.IDProdQuery?FieldNumber=" + $("#field-kid").html();
				break;
			case "wwc5":
				var url = "http://chasm.kgs.ku.edu/ords/wwc5.wwc5d2.well_details?well_id=" + $("#seq-num").html();
				break;
			case "lease":
				var url = "https://chasm.kgs.ku.edu/ords/oil.ogl5.MainLease?f_lc=" + $("#lease-kid").html();
				break;
		}
		var win = window.open(url, "target='_blank'");
    }


	showWwc5Scan = function() {
		$.get("getScanURL.cfm?num=" + $("#seq-num").html(), function(response) {
			if (response == "none") {
				alert("No scan available for this record.");
			} else {
				var win = window.open(response, "target='_blank'");
			}

		} );
    }


	function createTOC() {
        var lyrs = map.layers;
        var chkd, tocContent = "";
		var aerialTocContent = "";
		///var aquiferTocContent = "";
		var topoContent = "";
		var aerialGroup = ["2017","2015","2014","2012","2010","2008","2006","2002","1991","2014 HRO"];
		var aquiferGroup = ["Alluvial","Dakota","Flint-Hills","Glacial-Drift","High-Plains","Osage","Ozark"];
		var transparentLayers = ["Topo","2015","2014 1ft","2002","1991","Section-Township-Range","LPC Habitat","Oil and Gas Fields"];

        for (var j=lyrs.length - 1; j>-1; j--) {
            var layerID = lyrs._items[j].id;
            chkd = map.findLayerById(layerID).visible ? "checked" : "";
			var htmlID = layerID.replace(/ /g, "-");

			if (layerID.indexOf("-layer-") === -1 && aerialGroup.indexOf(htmlID) === -1 && aquiferGroup.indexOf(htmlID) === -1 && layerID.indexOf("Base Map") === -1 && layerID.indexOf("Topography") === -1) {
                // ^ Excludes default graphics layer from the TOC and separates grouped and ungrouped layers.
                tocContent += "<div class='toc-item' id='" + htmlID + "'><label class='toc-label'><input type='checkbox' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label>";

                if ($.inArray(layerID, transparentLayers) !== -1) {
                    // Add transparency control buttons to specified layers.
                    tocContent += "</span><span class='esri-icon-forward toc-icon' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='trans-pct' id='" + htmlID + "-trans-pct' title='Percent opaque'>100%</span><span class='esri-icon-reverse toc-icon' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'>";
                }

                tocContent += "</div>";
            }

			if (aquiferGroup.indexOf(htmlID) > -1) {
				aquiferTocContent += "<div class='toc-sub-item' id='" + htmlID + "'><label class='toc-label'><input type='checkbox' class='filterable' value='" + layerID + "' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label><span class='esri-icon-forward toc-icon' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='trans-pct' id='" + htmlID + "-trans-pct' title='Percent opaque'>100%</span><span class='esri-icon-reverse toc-icon' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'></span></div>";
			}

			if (layerID.indexOf("Topography") > -1) {
				topoContent += "<div class='toc-item' id='" + htmlID + "'><label class='toc-label'><input type='checkbox' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label>";
				topoContent += "</span><span class='esri-icon-forward toc-icon' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='trans-pct' id='" + layerID + "-trans-pct' title='Percent opaque'>100%</span><span class='esri-icon-reverse toc-icon' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'>";
				topoContent += "</div>";
			}

			if (aerialGroup.indexOf(htmlID) > -1) {
				aerialTocContent += "<div class='toc-sub-item' id='" + htmlID + "'><label class='toc-label'><input type='checkbox' class='filterable' value='" + layerID + "' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label><span class='esri-icon-forward toc-icon' title='Make Layer Opaque' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;up&quot;);'></span><span class='trans-pct' id='" + layerID + "-trans-pct' title='Percent opaque'>100%</span><span class='esri-icon-reverse toc-icon' title='Make Layer Transparent' onclick='changeOpacity(&quot;" + layerID + "&quot;,&quot;down&quot;);'></span></div>";
			}

			if (layerID.indexOf("Base Map") > -1) {
            	var basemapTocContent = "<div class='toc-item' id='" + htmlID + "'><label class='toc-label'><input type='checkbox' id='tcb-" + j + "' onclick='toggleLayer(" + j + ");'" + chkd + ">" + layerID + "</label>";
			}

        }

		// tocContent += "<div class='find-header esri-icon-right-triangle-arrow group-hdr' id='aquifer-group'><span class='find-hdr-txt'> Aquifers</div>";
		// tocContent += "<div class='find-body hide' id='aquifer-group-body'></div>";
		tocContent += topoContent;
		tocContent += "<div class='find-header esri-icon-right-triangle-arrow group-hdr' id='aerial-group'><span class='find-hdr-txt'> Aerials</div>";
		tocContent += "<div class='find-body hide' id='aerial-group-body'></div>";
		tocContent += basemapTocContent + "</div>";

        tocContent += "<div class='toc-note display-note'>* Some layers only visible when zoomed in. Layers draw on top of one another in the<br> order listed.</div>";
        $("#lyrs-toc").html(tocContent);
		$("#aerial-group-body").html(aerialTocContent);
		// $("#aquifer-group-body").html(aquiferTocContent);

		// Prairie chicken specific stuff:
		// $("label:contains('LPC Habitat')").after("<span class='esri-icon-description' id='lpc-disclaimer'></span>");
		// $("#lpc-disclaimer").click(function() {
		// 	$("#lpc-dia").dialog("open");
		// } );

		// Click handlers for TOC groups:
		$(".group-hdr").click(function() {
			var group = $(this).attr("id");
			if ( $(this).hasClass("esri-icon-down-arrow") ) {
				$("#" + group + "-body").fadeOut("fast");
			} else {
				$("#" + group + "-body").fadeIn("fast");
			}
			$(this).toggleClass("esri-icon-down-arrow esri-icon-right-triangle-arrow no-border");
		} );

		// Click handler for TOC checkboxes:
		$("[id^='tcb-']").change(function() {
			saveTocPrefs(this.id);
		} );
    }


	function saveTocPrefs(tocItem) {
		var chkd = $("#"+tocItem).prop("checked");
		localStorage.setItem("kgsog_" + tocItem, chkd);
	}


	function setTocPrefs() {
		$.each(localStorage, function(key, val) {
			if (key.indexOf("kgsog") > -1) {
				if (key.indexOf("tcb") > -1) {
					var chkBoxID = key.replace("kgsog_", "");
					if (val === "true") {
						$("#" + chkBoxID).prop("checked", true);
					} else {
						$("#" + chkBoxID).prop("checked", false);
					}

					// Set visibility:
					var j = key.substr(key.indexOf("-") + 1);
					var l = map.findLayerById(map.layers._items[j].id);
					l.visible = $("#tcb-" + j).is(":checked") ? true : false;
				}
			}
		} );
	}


	function setPrefs() {
		// Label pref:
		var lbl = localStorage.getItem("kgsog_label");

		$("input[name=labelname][value='" + lbl + "']").prop("checked",true);
		labelWells();

		// Classification pref:
		// var cla = localStorage.getItem("kgsog_classification");
		// $("input[name=ct][value='" + cla + "']").prop("checked",true);
		// classifyWells();

		// Bookmarks:
		$.each(localStorage, function(key, val) {
			if (key.indexOf("kgsog") > -1) {
				if (key.indexOf("-bm-") > -1) {
					var bName = key.slice(9).replace(/xx/g, " ");	// put spaces back in name.
					bName = bName.replace(/yyy/g, "'");	// put apostrophes back.
					var link = "<div class='bookmark-link' id='" + key + "'><span class='esri-icon-map-pin'></span><span class='b-name' onclick='goToBookmark(&quot;" + key + "&quot;)'>" + bName + "</span><span class='esri-icon-minus-circled' title='Delete Bookmark' onclick='deleteBookmark(&quot;" + key + "&quot;)'></span></div>";
					$("#bookmark-links").append(link);
				}
			}
		} );
	}


	downloadData = function(type) {
		if (ogLayer.visible) {
			$("#wells-link").html("");
			$("#loader2").show();

			var extLL = webMercatorUtils.xyToLngLat(view.extent.xmin, view.extent.ymin);
			var extUR = webMercatorUtils.xyToLngLat(view.extent.xmax, view.extent.ymax);

			var kid;
			if (view.popup.selectedFeature) {
				kid = view.popup.selectedFeature.attributes.KID;
			}

			var packet = { "attrWhere": attrWhere, "ogCombowhere": ogComboWhere, "xmin": extLL[0], "xmax": extUR[0], "ymin": extLL[1], "ymax": extUR[1], "type": type, "kid": kid };

			$.post( "downloadOGData.cfm", packet, function(response) {
				if (type === "d") {
					$("#wells-link").html(response);
				} else {
					window.open("https://maps.kgs.ku.edu/oilgas/output/" + response, "target='_blank'");
				}
				$("#loader2").hide();
			} );
		} else {
			alert("Oil and gas wells layer must be turned on (Display tab).");
		}

		// if (wwc5Layer.visible) {
		// 	$("#wells-link").html("");
		// 	$("#loader2").show();
		//
		// 	var extLL = webMercatorUtils.xyToLngLat(view.extent.xmin, view.extent.ymin);
		// 	var extUR = webMercatorUtils.xyToLngLat(view.extent.xmax, view.extent.ymax);
		//
		// 	var inputSeqNum;
		// 	if (view.popup.selectedFeature) {
		// 		var inputSeqNum = view.popup.selectedFeature.attributes.INPUT_SEQ_NUMBER;
		// 	}
		//
		// 	var packet = { "attrWhere": attrWhere, "combowhere": comboWhere, "xmin": extLL[0], "xmax": extUR[0], "ymin": extLL[1], "ymax": extUR[1], "type": type, "seqnum": inputSeqNum };
		//
		// 	$.post( "downloadWells.cfm", packet, function(response) {
		// 		if (type === "d") {
		// 			$("#wells-link").html(response);
		// 			$("#loader2").hide();
		// 		} else {
		// 			window.open("https://maps.kgs.ku.edu/oilgas/output/" + response, "target='_blank'");
		// 			$("#loader2").hide();
		// 		}
		// 	} );
		// } else {
		// 	alert("Wells layer must be turned on (Display tab).");
		// }
	}


    labelWells = function() {
		var lbl = $("input[name=labelname]:checked").val();

		// if (wwc5Layer.findSublayerById(3).visible == true) {
		// 	var theLayer = wwc5Layer.findSublayerById(3);
		// }
		// if (wwc5Layer.findSublayerById(12).visible == true) {
		// 	var theLayer = wwc5Layer.findSublayerById(12);
		// }
		// if (wwc5Layer.findSublayerById(13).visible == true) {
		// 	var theLayer = wwc5Layer.findSublayerById(13);
		// }
		// if (wwc5Layer.findSublayerById(14).visible == true) {
		// 	var theLayer = wwc5Layer.findSublayerById(14);
		// }
		// if (wwc5Layer.findSublayerById(15).visible == true) {
		// 	var theLayer = wwc5Layer.findSublayerById(15);
		// }

		switch (lbl) {
			case "none":
				ogLayer.findSublayerById(0).labelsVisible = false;
				break;
			default:
				ogLayer.findSublayerById(0).labelingInfo[0].labelExpression = "[" + lbl + "]";
				ogLayer.findSublayerById(0).labelsVisible = true;
		}

		// wwc5Layer.refresh();
		// refresh doesn't always seem to make labels display but jogging the map does:
		var nudge = new Point( {x: view.center.x, y: view.center.y + 0.0001, spatialReference: wmSR} );
		view.center = nudge;

		// Save setting:
		localStorage.setItem("kgsog_label", lbl);
	}


    changeOpacity = function(id, dir) {
        var lyr = map.findLayerById(id);
        var incr = (dir === "down") ? -0.1 : 0.1;
		var hID = id.replace(/ /g, "-");

		if ( ((lyr.opacity + incr) > 0) && ((lyr.opacity + incr) < 1.1) ) {
			lyr.opacity = lyr.opacity + incr;
			var percent = Math.floor(lyr.opacity * 100);
			$("#" + hID + "-trans-pct").html(percent + "%");
		}
    }


    function executeIdTask(event) {
        identifyParams.geometry = event.mapPoint;
        identifyParams.mapExtent = view.extent;
		identifyParams.layerDefinitions = idDef;
        dom.byId("mapDiv").style.cursor = "wait";
		userDefinedPoint = new Graphic();

        identifyTask.execute(identifyParams).then(function(response) {
			for (var i = 0; i < response.results.length; i++) {
				if (map.findLayerById(response.results[i].layerName).visible === false) {
					// If layer isn't visible in TOC, remove it so it's not included in popup.
					response.results.splice(i, 1);
				}
			}
			return addPopupTemplate(response.results);
        } ).then(function(feature) {
			if (feature.length > 0) {
				view.popup.actions.splice(3, 1);

            	openPopup(feature);

				// Highlight row in wells list table: 20181019 - not used.
				// var fAtts = feature[0].attributes;
				// if (fAtts.hasOwnProperty('INPUT_SEQ_NUMBER')) {
				// 	var ptID = fAtts.INPUT_SEQ_NUMBER;
				// } else if (fAtts.hasOwnProperty('KID')) {
				// 	var ptID = fAtts.KID;
				// }
				// $(".well-list-tbl tr").removeClass("highlighted");
				// $(".well-list-tbl tr:contains(" + ptID + ")").toggleClass("highlighted");

            	highlightFeature(feature);
			} else {
				dom.byId("mapDiv").style.cursor = "auto";
			}
        } );
    }


	function addPopupTemplate(response) {
		return arrayUtils.map(response, function(result) {
			var feature = result.feature;
			var layerName = result.layerName;

			if ( result.hasOwnProperty('attributes') && result.attributes.hasOwnProperty('API_NUMBER') ) {
				// Special case when coming from Find By API, which uses a queryTask.
				layerName = "Oil and Gas Wells";
				feature = result;
			}

			if (layerName === "Oil and Gas Wells") {
				var ogWellsTemplate = new PopupTemplate( {
					title: "WELL - <span class='pu-title'>{WELL_LABEL} </span><span class='pu-note'>{API_NUMBER}</span>",
					content: ogWellContent(feature)
				} );
				feature.popupTemplate = ogWellsTemplate;
			} else if (layerName === "WWC5 Water Wells") {
				var wwc5Template = new PopupTemplate( {
					title: "WATER WELL - {OWNER_NAME}",
					content: wwc5Content(feature)
				} );
				feature.popupTemplate = wwc5Template;
			} else if (layerName === "Oil and Gas Fields") {
				var ogFieldTemplate = new PopupTemplate( {
					title: "FIELD - {FIELD_NAME}",
					content: ogFieldContent(feature)
				} );
				feature.popupTemplate = ogFieldTemplate;
			} else if (layerName === "Leases") {
				var leaseTemplate = new PopupTemplate( {
					title: "LEASE - {LEASE_NAME}",
					content: leaseContent(feature)
				} );
				feature.popupTemplate = leaseTemplate;
			}

			return feature;
		} );
	}


	function ogWellContent(feature) {
		var f = feature.attributes;

		var nsDir = f.FEET_NORTH_FROM_REFERENCE < 0 ? "South" : "North";
		var ewDir = f.FEET_EAST_FROM_REFERENCE < 0 ? "West" : "East";
		if (f.FEET_NORTH_FROM_REFERENCE !== "" && f.FEET_EAST_FROM_REFERENCE !== "") {
			var footages = Math.abs(f.FEET_NORTH_FROM_REFERENCE) + " " + nsDir + ", " + Math.abs(f.FEET_EAST_FROM_REFERENCE) + " " + ewDir + " from " + f.REFERENCE_CORNER + " corner";
		} else {
			var footages = "";
		}

		if (f.ELEVATION_KB != "" && f.ELEVATION_KB != "Null") {
			var elev = f.ELEVATION_KB + " KB";
		} else if (f.ELEVATION_DF != "" && f.ELEVATION_DF != "Null") {
			var elev = f.ELEVATION_DF + " DF";
		} else if (f.ELEVATION_GL != "" && f.ELEVATION_GL != "Null") {
			var elev = f.ELEVATION_GL + " GL";
		} else if (f.ELEVATION != "" && f.ELEVATION != "Null") {
			var elev = f.ELEVATION + " Est.";
		} else {
			var elev = "";
		}

		var content = "<span class='esri-icon-table pu-icon' onclick='showFullInfo(&quot;ogwell&quot;);' title='View Full KGS Database Record'></span><span class='esri-icon-contact pu-icon' onclick='$(&quot;#prob-dia&quot;).dialog(&quot;open&quot;);' title='Report a Location or Data Problem'></span>";
		content += "<table id='popup-tbl'><tr><td>API:</td><td>{API_NUMBER}</td></tr>";
		content += "<tr><td>Lease:</td><td style='white-space:normal'>{LEASE_NAME}</td></tr>";
		content += "<tr><td>Well:</td><td>{WELL_NAME}</td></tr>";
		content += "<tr><td>Well Type:</td><td>{STATUS}</td></tr>";
		content += "<tr><td>Status:</td><td>{WELL_CLASS}</td></tr>";
		content += "<tr><td>Original Operator:</td><td>{OPERATOR_NAME}</td></tr>";
		content += "<tr><td>Current Operator:</td><td>{CURR_OPERATOR}</td></tr>";
        content += "<tr><td>Field Name:</td><td>{FIELD_NAME}</td></tr>";
        content += "<tr><td>Location:</td><td>T{TOWNSHIP}{TOWNSHIP_DIRECTION} R{RANGE}{RANGE_DIRECTION} Sec {SECTION}, {SPOT} {SUBDIVISION_4_SMALLEST} {SUBDIVISION_3} {SUBDIVISION_2} {SUBDIVISION_1_LARGEST}</td></tr>";
        content += "<tr><td>Footages:</td><td>" + footages + "</td></tr>";
		content += "<tr><td>Latitude, Longitude (NAD27):</td><td>{NAD27_LATITUDE},&nbsp;&nbsp;{NAD27_LONGITUDE}</td></tr>";
		content += "<tr><td>Lat-Lon Source:</td><td>{LONGITUDE_LATITUDE_SOURCE}</td></tr>";
        content += "<tr><td>County:</td><td>{COUNTY}</td></tr>";
		content += "<tr><td>Permit Date:</td><td>{PERMIT_DATE_TXT}</td></tr>";
		content += "<tr><td>Spud Date:</td><td>{SPUD_DATE_TXT}</td></tr>";
		content += "<tr><td>Completion Date:</td><td>{COMPLETION_DATE_TXT}</td></tr>";
		content += "<tr><td>Plug Date:</td><td>{PLUG_DATE_TXT}</td></tr>";
		content += "<tr><td>Total Depth:</td><td>{ROTARY_TOTAL_DEPTH}</td></tr>";
		content += "<tr><td>Elevation:</td><td>" + elev + "</td></tr>";
		content += "<tr><td>Producing Formation:</td><td>{PRODUCING_FORMATION}</td></tr>";
		content += "<tr><td>Well KID:</td><td id='well-kid'>{KID}</td></tr>";
		content += "</table>";

        return content;
    }


	function ogFieldContent(feature) {
		var content = "<span class='esri-icon-table pu-icon' onclick='showFullInfo(&quot;field&quot;);' title='View KGS Field Production Page'></span><span class='esri-icon-contact pu-icon' onclick='$(&quot;#prob-dia&quot;).dialog(&quot;open&quot;);' title='Report a Location or Data Problem'></span><span class='esri-icon-environment-settings pu-icon' onclick='showAssignedWells({FIELD_KID});' title='Show Wells Assigned to this Field'></span><span class='esri-icon-erase' id='pu-erase' onclick='clearOGFilter()' title='Clear filters, buffers, graphics, and selected wells'></span>";
		content += "<table id='popup-tbl'><tr><td>Field Name:</td><td>{FIELD_NAME}</td></tr>";
		content += "<tr><td>Status:</td><td style='white-space:normal'>{STATUS}</td></tr>";
		content += "<tr><td>Type of Field:</td><td style='white-space:normal'>{FIELD_TYPE}</td></tr>";
		content += "<tr><td>Produces Oil:</td><td style='white-space:normal'>{PROD_OIL}</td></tr>";
		content += "<tr><td>Produces Gas:</td><td style='white-space:normal'>{PROD_GAS}</td></tr>";
		content += "<tr><td>Producing Formations:</td><td style='white-space:normal'>{FORMATIONS}</td></tr>";
		content += "<tr><td>Field KID:</td><td id='field-kid' style='white-space:normal'>{FIELD_KID}</td></tr>";
		content += "</table>";

        return content;
    }


    function wwc5Content(feature) {
		var content = "<span class='esri-icon-table pu-icon' onclick='showFullInfo(&quot;wwc5&quot;);' title='View Full KGS Database Record'></span><span class='esri-icon-contact pu-icon' onclick='$(&quot;#prob-dia&quot;).dialog(&quot;open&quot;);' title='Report a Location or Data Problem'></span><span class='esri-icon-documentation pu-icon' onclick='showWwc5Scan();' title='View Scanned WWC5 Form'></span>";
		content += "<table id='popup-tbl'>";
		content += "<tr><td>Owner:</td><td>{OWNER_NAME}</td></tr>";
		content += "<tr><td>Use:</td><td style='white-space:normal'>{USE_DESC}</td></tr>";
		content += "<tr><td>Status:</td><td>{STATUS}</td></tr>";
		content += "<tr><td>Well ID:</td><td>{MONITORING_NUMBER}</td></tr>";
		content += "<tr><td>Depth (ft):</td><td>{DEPTH_TXT}</td></tr>";
        content += "<tr><td>Static Water Level (ft):</td><td>{STATIC_LEVEL_TXT}</td></tr>";
        content += "<tr><td>Estimated Yield (gpm):</td><td>{YIELD_TXT}</td></tr>";
        content += "<tr><td>Elevation (ft):</td><td>{ELEV_TXT}</td></tr>";
        content += "<tr><td>Completion Date:</td><td>{COMP_DATE_TXT}</td></tr>";
        content += "<tr><td>Driller:</td><td style='white-space:normal'>{CONTRACTOR}</td></tr>";
        content += "<tr><td>DWR Number:</td><td>{DWR_APPROPRIATION_NUMBER}</td></tr>";
        content += "<tr><td>KGS Record Number:</td><td id='seq-num'>{INPUT_SEQ_NUMBER}</td></tr>";
        content += "<tr><td>County:</td><td>{COUNTY}</td></tr>";
        content += "<tr><td>Section:</td><td>T{TOWNSHIP}S&nbsp;&nbsp;R{RANGE}{RANGE_DIRECTION}&nbsp;&nbsp;Sec {SECTION}</td></tr>";
        content += "<tr><td>Quarter Section:</td><td>{QUARTER_CALL_3}&nbsp;&nbsp;{QUARTER_CALL_2}&nbsp;&nbsp;{QUARTER_CALL_1_LARGEST}</td></tr>";
		content += "<tr><td>Latitude, Longitude (NAD27):</td><td>{NAD27_LATITUDE},&nbsp;&nbsp;{NAD27_LONGITUDE}</td></tr>";
		content += "<tr><td>Lat-Lon Source:</td><td>{LONGITUDE_LATITUDE_SOURCE}</td></tr></table>";

        return content;
    }


	function leaseContent(feature) {
		var f = feature.attributes;

		var spot = "";
		var sub4 = "";
		var sub3 = "";
		var sub2 = "";
		var sub1 = "";
		var pf = "";
		var units = "";
		var fn = "";
		var cp = "";
		var cpf = "";
		var cpt = "";
		var dor = "";
		var dorname = "";
		var to = " to ";

		if (f.SPOT != "Null") {
			spot = f.SPOT;
		}
		if (f.SUBDIVISION_4_SMALLEST != "Null") {
			sub4 = f.SUBDIVISION_4_SMALLEST;
		}
		if (f.SUBDIVISION_3 != "Null") {
			sub3 = f.SUBDIVISION_3;
		}
		if (f.SUBDIVISION_2 != "Null") {
			sub2 = f.SUBDIVISION_2;
		}
		if (f.SUBDIVISION_1_LARGEST != "Null") {
			sub1 = f.SUBDIVISION_1_LARGEST;
		}

		if (f.PRODUCING_FORMATION != "Null") {
			pf = f.PRODUCING_FORMATION;
		}

		if (f.PRODUCES_OIL == "Yes") {
			units = "bbls";
		}
		if (f.PRODUCES_GAS == "Yes") {
			units = "mcf";
		}

		if (f.FIELD_NAME != "Null") {
			fn = f.FIELD_NAME;
		}

		if (f.CUMULATIVE_PRODUCTION != "Null") {
			cp = f.CUMULATIVE_PRODUCTION;
		}
		if (f.CUMULATIVE_YEAR_STARTED != "Null") {
			cpf = f.CUMULATIVE_YEAR_STARTED;
		}
		if (f.CUMULATIVE_YEAR_ENDED != "Null") {
			cpt = f.CUMULATIVE_YEAR_ENDED;
		}
		if (cpf === "" && cpt === "") {
			to = "";
		}

		if (f.LEASE_CODE_DOR != "Null") {
			dor = f.LEASE_CODE_DOR;
		}

		if (f.LEASE_NAME_DOR != "Null") {
			dorname = f.LEASE_NAME_DOR;
		}

		var content = "<span class='esri-icon-table pu-icon' onclick='showFullInfo(&quot;lease&quot;);' title='View KGS Lease Production Page'></span><span class='esri-icon-contact pu-icon' onclick='$(&quot;#prob-dia&quot;).dialog(&quot;open&quot;);' title='Report a Location or Data Problem'></span>";
		content += "<table id='popup-tbl'><tr><td>Lease Name:</td><td>{LEASE_NAME}</td></tr>";
		content += "<tr><td>Operator:</td><td style='white-space:normal'>{OPERATOR_NAME}</td></tr>";
		content += "<tr><td>Produces Oil:</td><td style='white-space:normal'>{PRODUCES_OIL}</td></tr>";
		content += "<tr><td>Produces Gas:</td><td style='white-space:normal'>{PRODUCES_GAS}</td></tr>";
		content += "<tr><td>Cumulative Production:</td><td style='white-space:normal'>" + cp + " " + units + "</td></tr>";
		content += "<tr><td>Production Dates:</td><td style='white-space:normal'>" + cpf + to + cpt + "</td></tr>";
		content += "<tr><td>Producing Zone:</td><td style='white-space:normal'>" + pf + "</td></tr>";
		content += "<tr><td>Field:</td><td style='white-space:normal'>" + fn + "</td></tr>";
		content += "<tr><td>KS DOR Lease Code:</td><td style='white-space:normal'>" + dor + "</td></tr>";
		content += "<tr><td>KS DOR Lease Name:</td><td style='white-space:normal'>" + dorname + "</td></tr>";
		content += "<tr><td>County:</td><td style='white-space:normal'>{NAME}</td></tr>";
		content += "<tr><td>Section:</td><td>T{TOWNSHIP}S&nbsp;&nbsp;R{RANGE}{RANGE_DIRECTION}&nbsp;&nbsp;Sec {SECTION}</td></tr>";
		content += "<tr><td>Quarter Section:</td><td>" + spot + "&nbsp;&nbsp;" + sub4 + "&nbsp;&nbsp;" + sub3 + "&nbsp;&nbsp;" + sub2 + "&nbsp;&nbsp;" + sub1 + "</td></tr>";
		content += "<tr><td>Lease KID:</td><td id='lease-kid'>{KID}</td></tr>";
		content += "</table>";

        return content;
    }


	showAssignedWells = function(fieldKID) {
		ogLayer.findSublayerById(0).definitionExpression = "FIELD_KID = " + fieldKID;
		idDef[0] = "FIELD_KID = " + fieldKID;
	}


    toggleLayer = function(j) {
        var l = map.findLayerById(map.layers._items[j].id);
        l.visible = $("#tcb-" + j).is(":checked") ? true : false;
    }

} );
