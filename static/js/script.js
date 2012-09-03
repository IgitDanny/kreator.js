define(['text', 'jquery', 'htmlEntites', 'buttonHandler', 'slide-template', 'settings', 'canvas'], function(textStyle, $, htmlEntites, bHandler, slideTemplate, settings, canvas){

	var Kreator = (function (options) {
		var slideX = 0, // to keep track of the current slide we're on
			slideY = 0, // to keep track of the current slide we're on
			$ = options.jquery,
			Reveal = options.reveal,
			dummyText = $('<span contentEditable></span>'), // this is the generic span in which gets added to the section you edit this to insert content
			$span,
			hljs = options.hljs;

		var init = function() {

			options.right = $('<div data-direction="right">+</div>')
					.addClass('add-slide add-right')
					.on('click', function(){
						Kreator.addSlideRight();
						Reveal.navigateRight();
					});
			
			options.down = $('<div data-direction="bottom">+</div>')
					.addClass('add-slide add-down')
					.on('click', function(){
						Kreator.addSlideDown();
						Reveal.navigateDown();
					});
			
			var uioptions = settings.get();
			if(uioptions && uioptions.hasOwnProperty('body')) {
				$('body').css('background', uioptions.body[0].split(':')[1]);
			}

			// $(window).on('mousemove', function(e){
			// 	$('#coords').text(e.offsetX + ' ' + e.offsetY);	
			// });

			$('body').append(options.right).append(options.down);

			$('section').on('click', addContentToSlide);

			$('#download').on('click', function(){
				var s = $('.slides>section');
				var slides = {};
				
				s.each(function(idx, slide){
					slide = $(slide);
					if($('section', slide).length) {
						slides['slide'+idx] = [];
						$('section', slide).each(function(i, sl){
							sl = $(sl);
							content = sl.html();
							content = htmlEntites.convertTags(content);
							slides['slide'+idx].push(content);
						});
					} else {
						content = slide.html();
						content = htmlEntites.convertTags(content);
						slides['slide'+idx] = '<section>' + content + '</section>';
					}
				});
		
				var html = document.querySelector('html'),
					theme;
				if(html.classList.length) {
					theme = html.classList[0];
					if(theme.length>6) {
						theme = null;
					}
				} else {
					theme = null;
				}
				
				var webfonts = '';
				var fonts = settings.get('webfont');
				if(Array.isArray(fonts)) webfonts = fonts.map(function (font) {
					return "<link href='http://fonts.googleapis.com/css?family="+font+"' rel='stylesheet' type='text/css'>"
				}).join('');
					else webfonts = "<link href='http://fonts.googleapis.com/css?family="+fonts+"' rel='stylesheet' type='text/css'>";

				var title = settings.get('title') || 'kreator.js presentation';
				
				$.ajax({
					  type: 'POST'
					, url : '.'
					, dataType : 'jsonpi'
					, params : {
						slides : slides,
						params: settings.get(),
						theme: theme,
						webfont: webfonts,
						title: title
					}
				})
				//settings.clear();
			});

			$('#settings-btn').on('click', function(){
				slideTemplate.showSettings.call($('.reveal'));
			});

			$('.btn-group a').on('click', function(e){
				e.preventDefault();
				var tag = $(this).data('textstyle');
				if(tag === 'li') {
					$(this).toggleClass('active');
					$('<span contentEditable><li></li></span>')
						.on('click', editSpan)
						.appendTo(Kreator.getCurrentSlide())
						.trigger('click').focus();
				}

				var string = '';
				if(['b', 'i'].indexOf(tag)>=0) {
					$span.html(textStyle.format(tag, $span));
				} else if(['blockquote'].indexOf(tag)>=0) {
					textStyle.paragraph(tag, $span);
				} else if(['left', 'center', 'right'].indexOf(tag)>=0) {
					textStyle.align(tag, $span);
				} else if(tag === 'a') {
					textStyle.insertHiperlink(this, $span);
				} else if(tag === 'move') {
					var s = Kreator.getCurrentSlide();
					$(this).toggleClass('active btn-info');
					var section = $('.reveal section');
					if(s.hasClass('crosshair')) {
						$('.present span').off('click', bHandler.moveSpan)
								.attr('contentEditable', true);
					} else {
						$('.present span').on('mousedown', bHandler.moveSpan)
								.attr('contentEditable', false);
					}
					$('.present').toggleClass('crosshair');
					$('body').toggleClass('noselect');

				} else if(tag === 'grid') {
					$(this).toggleClass('active');
					if($(this).hasClass('active')) {
						canvas.init();
					} else {
						canvas.remove();
					}
				} else if(tag === 'remove') {
					
					var $this = $(this).toggleClass('active btn-info');
					$('.present').toggleClass('crosshair');
					
					if($this.hasClass('active')) {
						$('span').on('click', bHandler.removeSpan);
					} else {
						$('span').off('click', bHandler.removeSpan);
					}
				} else if(tag === 'grid-clear') {
					settings.remove(['canvasPoints']);
				} else if(tag === 'upload') {
					$(this).toggleClass('active');
					slideTemplate.uploadImages.call($(this));
				} else if(tag === 'images') {
					$(this).toggleClass('active');
					$('.showreel').toggle();
				} else if(tag === 'resize') {
					$(this).toggleClass('active');
					$('.present').toggleClass('resize');
					var img = document.querySelector('.present img');
					img.ondragstart = function (e) {
						this.setAttribute('data-x', e.pageX);
						this.setAttribute('data-y', e.pageY);
						console.log(this.width);
					}
					img.ondrag = function (e) {
						var x = parseInt(this.getAttribute('data-x'));
						var y = parseInt(this.getAttribute('data-y'));
						var p = x / e.pageX;
						var w = this.width;
						this.style.width = p * w + 'px';
					}
				}
			});

			$('.showreel img').live('click', function () {
				var el = $('<img>').attr('src', $(this).attr('src')).css('width', '200px');
				var s = $('<span/>').append(el).appendTo('.present');
				s.on('click', function (e) {
					editSpan(e, this);
				});
			})

			$('#cl-dimensions').on('change', function(){
				var tag = $(this).val(),
				string = textStyle.paragraph(tag, $span);
				if(string) $span.html(string);
			});

			$('.fullscreen').on('click', function(){
				bHandler.toggleFullscreen();
				Reveal.navigateTo(0,0);
			});

			$(window).on('paste', function(e){
				setTimeout(function(){textStyle.formatCode.call(Kreator, $span);}, 100);
			});

			$('.menu li').on('click', function () {
				var action = $(this).attr('title');
				
				if(action === 'rotate') {
					$('.menu .active').removeClass('active');
					$(this).addClass('active');
					
					$span.css('transform','rotate(10deg)');
					if(!document.querySelector('#range-handler')) {
						var fragment = document.createDocumentFragment()
						, li = document.createElement('li')
						, range = document.createElement('input');
						range.type="range";
						range.id ="range-handler";
						range.min=-180;
						range.max=180;
						range.addEventListener('change', function(){
							$('#menu-input').val(this.value + ' deg').trigger('keyup');
						}, false);
						li.appendChild(range);
						fragment.appendChild(li);
						document.querySelector('.menu').appendChild(fragment);
					} else {
						$('#range-handler').show();
					}

				} else if(action === 'add class') {
					$('.menu .active').removeClass('active');
					$('#range-handler').hide();
					$(this).addClass('active');
					var clsName = $span.attr('class');
					$('#menu-input').attr('placeholder', 'class name').val(clsName);
				} else if(action === 'clear') {
					var clsName = $span.attr('class');
					settings.remove(clsName);
					$span.removeClass();
					$span.css({
						'transform': 'none',
						'font-family': 'inherit'
					});
				} else if(action === 'font') {
					$('#range-handler').hide();
					$('#menu-input').attr('placeholder', 'font family').val($span.css('font-family'));
					$span.addClass('kreator-class');
					$('.menu .active').removeClass('active');
					$(this).addClass('active');
				}

			});

			$('#menu-input').on('keyup', function (e) {
				var value = parseInt($(this).val()) || 0;
				var action = $('.menu .active').attr('title');
				var clsName = $span.attr('class') || $span.addClass('kreator-class') && $span.attr('class');
				console.log(action, clsName, $span);
				if(action === 'rotate') {
					$span.css('transform','rotate('+value+'deg)');
					if(clsName) {
						settings.set(['.'+clsName, 'transform: rotate('+value+'deg)']);
					}
				} else if (action === 'add class') {
					if(e.keyCode == 13) {
						var oldCls = $span.attr('class');
						var newCls = $(this).val();
						$span.removeClass().addClass(newCls);
						$('#menu-input').val('');
						settings.copy('.'+oldCls, '.'+newCls);
					}
				} else if (action === 'font') {
					if(e.keyCode == 13) {
						var family = $(this).val();
						slideTemplate.addMessage(family);
						WebFont.load({
							google: {
								families: [ family ]
							},
							active: function () {
								$span.css('font-family', family);
								if(clsName) {
									console.log(settings.get());
									settings.set(['.'+clsName, 'font-family: ' + family]);
									console.log(settings.get());
								}
								settings.set(family, 'webfont');
							}
						});
					}
				}
			});


			var holder = document.querySelector('section')
			holder.ondragover = function () { return false; };
			holder.ondragend = function () { return false; };
			holder.ondrop = function (e) {
				e.preventDefault();
				var files = e.dataTransfer.files;
				for (var i = 0; i < files.length; i++) {
					slideTemplate.previewfile(holder, files[i]);
				}
			}

		};

		Reveal.addEventListener( 'slidechanged', function( event ) {
				Kreator.setSlideX(event.indexh);
				Kreator.setSlideY(event.indexv);
		});

		var setSlideX = function(x) {
			slideX = x;
		};

		var setSlideY = function(y) {
			slideY = y;
		};

		var addContentToSlide = function() {

			var count = $('span', Kreator.getCurrentSlide()).length;
			if ($('.present').hasClass('crosshair') || count > 10) return;

			var d = dummyText.clone().on('click', function(e){
				editSpan(e, d);
			})
				, list = ($('.btn.active').attr('data-textstyle') === 'li');
				
			d.appendTo(Kreator.getCurrentSlide()).trigger('click').focus();
			if(!count) {
				$('.menu.hidden').removeClass('hidden');
			}
		};
		
		var getLastSpan = function() {
			var s = Kreator.getCurrentSlide();
			var spans = $('span', s);
			return spans.eq(spans.length-1);
		};

		var getCurrentSlide = function() {
			return $('.present');
		};

		var addSlideRight = function() {
			var s = this.getCurrentSlide();
			// if the current slide is the last slide on the X axis we append to the parent
			if($('.slides>section').length == slideX+1) {
				$('<section/>').on('click', addContentToSlide).appendTo('.slides');
			} else { // else we just append after the current element
				$('<section/>').on('click', addContentToSlide).insertAfter(s);
			}

			$('.menu').addClass('hidden');
		};

		var addSlideDown = function() {
			var s = this.getCurrentSlide();

			if(s.parent().hasClass('slides')) {
				var c = $('<section/>').append(s.html());
				var ns = $('<section/>');
				s.html('').append(c).append(ns);
			} else {
				$('<section/>').insertAfter(s);
			}

			$('.menu').addClass('hidden');
		};

		var editSpan = function(e, that) {
			
			e.stopPropagation();
			$span = $(that) || $(this);

			var textStyle = htmlEntites.findTags($span.html());
			
			if(textStyle >= 0)
				$('#select-dimensions option:eq('+textStyle+')').attr('selected', 'selected')

			$('.menu').css({
				'top' : e.currentTarget.offsetTop + 27,
				'display' : 'block'
			})
			
		};

		return {
			addSlideDown: addSlideDown,
			addSlideRight: addSlideRight,
			editSpan: editSpan,
			getCurrentSlide: getCurrentSlide,
			setSlideX: setSlideX,
			setSlideY: setSlideY,
			init: init
		};
	})({
		jquery: $,
		reveal: Reveal,
		hljs: hljs,
		settings: settings
	});

	return Kreator;
});