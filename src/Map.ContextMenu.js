L.Map.mergeOptions({
	contextmenuItems: []
});

L.Map.ContextMenu = L.Handler.extend({

	statics: {
		BASE_CLS: 'leaflet-contextmenu'
	},

	initialize: function (map) {
		L.Handler.prototype.initialize.call(this, map);

		this._items = [];
		this._visible = false;

		var container = this._container = L.DomUtil.create('div', L.Map.ContextMenu.BASE_CLS, map._container);
		container.style.zIndex = 10000;
		container.style.position = 'absolute';
		this._container = container;

		if (map.options.contextmenuWidth) {
			container.style.width = map.options.contextmenuWidth + 'px';
		}
		
		this._createItems();
		
		L.DomEvent
			.on(container, 'click', L.DomEvent.stopPropagation)
			.on(container, 'mousedown', L.DomEvent.stopPropagation)
			.on(container, 'dblclick', L.DomEvent.stopPropagation)
			.on(container, 'contextmenu', L.DomEvent.stopPropagation);
	},

	addHooks: function () {
		L.DomEvent.on(document, 'keydown', this._onKeyDown, this);

		this._map.on({
			contextmenu: this._show,
			mouseout: this._hide,
			mousedown: this._hide
		}, this);
	},

	removeHooks: function () {
		L.DomEvent.off(document, 'keydown', this._onKeyDown, this);

		this._map.off({
			contextmenu: this._show,
			mouseout: this._hide,
			mousedown: this._hide
		}, this);
	},

	showAt: function (point, data) {
		if (point instanceof L.LatLng) {
			point = this._map.latLngToContainerPoint(point);
		}
		this._showAtPoint(point, data);
	},

	hide: function () {
		this._hide();
	},

	addItem: function (options) {
		return this.insertItem(options);
	},

	insertItem: function (options, index) {
		index = index !== undefined ? index: this._items.length; 

		var item = this._createItem(this._container, options, index);
		
		this._items.push(item);

		this._map.fire('contextmenu.additem', {
			contextmenu: this,
			el: item.el,
			index: index
		});

		return item.el;
	},

	removeItem: function (item) {
		var container = this._container;

		if (!isNaN(item)) {
			item = container.children[item];
		}

		if (item) {
			this._removeItem(L.Util.stamp(item));

			this._map.fire('contextmenu.removeitem', {
				contextmenu: this,
				el: item
			});
		}		
	},

	removeAllItems: function () {
		var item;

		while (this._container.children.length) {
			item = this._container.children[0];
			this._removeItem(L.Util.stamp(item));
		}
	},

	setDisabled: function (item, disabled) {
		var container = this._container,
		itemCls = L.Map.ContextMenu.BASE_CLS + '-item';

		if (!isNaN(item)) {
			item = container.children[item];
		}

		if (item && L.DomUtil.hasClass(item, itemCls)) {
			if (disabled) {
				L.DomUtil.addClass(item, itemCls + '-disabled');
				this._map.fire('contextmenu.disableitem', {
					contextmenu: this,
					el: item
				});
			} else {
				L.DomUtil.removeClass(item, itemCls + '-disabled');
				this._map.fire('contextmenu.enableitem', {
					contextmenu: this,
					el: item
				});
			}			
		}
	},

	isVisible: function () {
		return this._visible;
	},

	_createItems: function () {
		var itemOptions = this._map.options.contextmenuItems,
		    item,
		    i, l;

		for (i = 0, l = itemOptions.length; i < l; i++) {
			this._items.push(this._createItem(this._container, itemOptions[i]));
		}
	},

	_createItem: function (container, options, index) {
		if (options.separator || options === '-') {
			return this._createSeparator(container, index);
		}

		var itemCls = L.Map.ContextMenu.BASE_CLS + '-item', 
		    cls = options.disabled ? (itemCls + ' ' + itemCls + '-disabled') : itemCls,
		    el = this._insertElementAt('a', cls, container, index),
		    callback = this._createEventHandler(el, options.callback, options.context),
		    html = '';
		
		if (options.icon) {
			html = '<img class="' + L.Map.ContextMenu.BASE_CLS + '-icon" src="' + options.icon + '"/>';
		} else if (options.iconCls) {
			html = '<span class="' + L.Map.ContextMenu.BASE_CLS + '-icon ' + options.iconCls + '"></span>';
		}

		el.innerHTML = html + options.text;		
		el.href = '#';

		L.DomEvent
			.on(el, 'click', L.DomEvent.stopPropagation)
			.on(el, 'mousedown', L.DomEvent.stopPropagation)
			.on(el, 'dblclick', L.DomEvent.stopPropagation)
			.on(el, 'click', L.DomEvent.preventDefault)
			.on(el, 'click', callback);

		return {
			id: L.Util.stamp(el),
			el: el,
			callback: callback
		};
	},

	_removeItem: function (id) {
		var item,
		    el,
		    i, l;

		for (i = 0, l = this._items.length; i < l; i++) {
			item = this._items[i];

			if (item.id === id) {
				el = item.el;
				callback = item.callback;

				if (callback) {
					L.DomEvent
						.off(el, 'click', L.DomEvent.stopPropagation)
						.off(el, 'mousedown', L.DomEvent.stopPropagation)
						.off(el, 'dblclick', L.DomEvent.stopPropagation)
						.off(el, 'click', L.DomEvent.preventDefault)
						.off(el, 'click', item.callback);				
				}
				
				this._container.removeChild(el);
				this._items.splice(i, 1);

				return item;
			}
		}
		return null;
	},

	_createSeparator: function (container, index) {
		var el = this._insertElementAt('div', L.Map.ContextMenu.BASE_CLS + '-separator', container, index);
		
		return {
			id: L.Util.stamp(el),
			el: el
		};
	},

	_createEventHandler: function (el, func, context) {
		var me = this,
		    map = this._map,
		    disabledCls = L.Map.ContextMenu.BASE_CLS + '-item-disabled';
		
		return function (e) {
			if (L.DomUtil.hasClass(el, disabledCls)) {
				return;
			}

			me._hide();			
			func.call(context || map, me._showLocation);			

			this.fire('contextmenu:select', {
				contextmenu: this,
				el: el
			});
		};
	},

	_insertElementAt: function (tagName, className, container, index) {
		var refEl,
		    el = document.createElement(tagName);

		el.className = className;

		if (index !== undefined) {
			refEl = container.children[index];
		}

		if (refEl) {
			container.insertBefore(el, refEl);
		} else {
			container.appendChild(el);
		}

		return el;
	},

	_show: function (e) {
		this._showAtPoint(e.containerPoint);
	},

	_showAtPoint: function (pt, data) {
		if (!this._visible && this._items.length) {
			var map = this._map,
			    layerPoint = map.containerPointToLayerPoint(pt),
			    latlng = map.layerPointToLatLng(layerPoint),
			    container = this._container,
			    eventData = {contextmenu: this};

			if (data) {
				L.extend(data, eventData);
			}

			this._showLocation = {
				latlng: latlng,
				layerPoint: layerPoint,
				containerPoint: pt,
			};
			
			L.DomUtil.setPosition(container, pt);
			container.style.display = 'block';
			
			this._visible = true;				

			this._map.fire('contextmenu.show', eventData);
		}		
	},

	_hide: function () {
		if (this._visible) {
			this._container.style.display = 'none';

			this._visible = false;

			this._map.fire('contextmenu.hide', {contextmenu: this});
		}
	},

	_onKeyDown: function (e) {
		var key = e.keyCode;

		// If ESC pressed and context menu is visible hide it 
		if (key === 27  && this._visible) {
			this._hide();
		}
	}
});

L.Map.addInitHook('addHandler', 'contextmenu', L.Map.ContextMenu);
