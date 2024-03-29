﻿define( ['durandal/system'], function ( system ) {
   ko.bindingHandlers["fadeVisible"] = {
      init: function ( element, valueAccessor, allBindingsAccessor ) {
         var value = valueAccessor();
         $( element ).toggle( ko.unwrap( value ) );
      },
      update: function ( element, valueAccessor, allBindingsAccessor ) {
         var value = valueAccessor(), fadeIn, fadeOut;
         others = allBindingsAccessor();

         if ( others.duration === undefined ) {
            others.duration = value.duration;
         }

         if ( others.duration !== undefined ) {
            if ( typeof others.duration == "number" ) {
               fadeIn = fadeOut = others.duration;
            } else {
               fadeIn = others.duration.fadeIn || 200;
               fadeOut = others.duration.fadeOut || 500;
            }
         }

         if ( others.duration && others.duration.type == 'transition' ) {
            if ( ko.unwrap( value ) ) {
               $( element ).stop().show().transition( { opacity: 1 }, fadeIn, 'ease', function () { } );
            } else {
               $( element ).stop().transition( { opacity: 0 }, fadeOut, 'ease', function () { $( this ).hide(); } );
            }
         } else {
            ko.unwrap( value ) ?
              $( element ).fadeIn( fadeIn ) :
              $( element ).fadeOut( fadeOut );
         }
      }
   };

   ko.bindingHandlers["dVisible"] = {
      init: function ( element, valueAccessor, allBindingsAccessor ) {
         var value = valueAccessor();
         $( element ).toggle( ko.unwrap( value ) );
      },
      update: function ( element, valueAccessor, allBindingsAccessor ) {
         var value = valueAccessor(), fadeIn, fadeOut;
         others = allBindingsAccessor();

         if ( others.duration === undefined ) {
            others.duration = value.duration;
         }

         if ( others.duration !== undefined ) {
            if ( typeof others.duration == "number" ) {
               fadeIn = fadeOut = others.duration;
            } else {
               fadeIn = others.duration.fadeIn || 0;
               fadeOut = others.duration.fadeOut || 500;
            }
         } else {
            fadeIn = fadeOut = 0;
         }

         var isActive = ko.unwrap( value );

         setTimeout( function () {
            $( element ).toggle( isActive );
         }, isActive ? fadeIn : fadeOut );

      }
   };

   ko.bindingHandlers["timeAgo"] = {
      init: function ( element, valueAccessor, allBindingsAccessor ) {

         var intervalID = setInterval( function ( data ) {
            if ( ko.dataFor( data.element ) ) {
               var time = new Date().getTime() - data.time;
               $( data.element ).text( timeAgo( time ) + 'ago' );
            } else {
               clearInterval( intervalID );
            }
         }, 5000, { element: element, time: valueAccessor() } );

         var time = new Date( new Date().getTime() - valueAccessor() );
         $( element ).text( timeAgo( time ) + 'ago' );


         function suffix_s( number, name, s ) {
            return number + ' ' + name + ( number > 1 ? ( s || 's' ) : '' ) + ' ';
         }

         function timeAgo( time ) {
            var str = "", count = 0;
            if ( time / 86400000 > 1 ) {
               str += suffix_s( Math.floor( time / 86400000 ), "day" )
               count++;
            }
            time %= 86400000;

            if ( str || time / 3600000 > 1 ) {
               str += suffix_s( Math.floor( time / 3600000 ), "hour" )
               count++;
            }
            time %= 3600000;

            if ( count == 2 ) return str;
            if ( str || time / 60000 > 1 ) {
               str += suffix_s( Math.floor( time / 60000 ), "min", ' ' )
               count++;
            }
            time %= 60000;

            if ( count == 2 || str ) return str;
            return "few seconds ";
         }
      }
   };

   ko.bindingHandlers["date"] = {
      init: function ( element, valueAccessor, allBindingsAccessor ) {
         var time = new Date( valueAccessor() ), str = "";

         str += ko.bindingHandlers.date.months[time.getMonth()] + ' ';
         str += ( '0' + time.getDate() ).substr( -2 ) + ' ';
         str += ( '0' + time.getHours() ).substr( -2 ) + ':' + ( '0' + time.getUTCMinutes() ).substr( -2 );

         $( element ).text( str );
      },
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
   };

   ko.bindingHandlers["dropdown"] = {
      init: function ( element, valueAccessor ) {
         var data = valueAccessor(), $element = $( element ).hide();
         var dic = {};

         if ( typeof ( data.selected ) !== "function" ) {
            data.selected = ko.observable( data.selected || $element.find( 'option[selected]' ).text() );
         }
         data.options = data.options || $element.find( 'option' ).map( function () { return $( this ).text() } ).get();

         dic.selectedItem = data.selected();

         var $list = $( '<ul/>', { 'class': 'container y scroll' } ).hide();
         for ( var i = 0; i < data.options.length; i++ ) {
            var listItem = $( '<li/>', { text: data.options[i] } ).on( "click", function () {
               var text = $( this ).text();
               if ( data.selected() != text ) {
                  data.selected( text );
                  $list.slideUp( 200 );
               }
            } ).appendTo( $list );

            dic[data.options[i]] = listItem;
         }

         var $lable = $( '<label/>', { 'class': 'select' } ).on( "click", function () {
            $list.slideToggle( 200 );
         } ).append(
           dic.selectedText = $( '<span/>', { 'class': 'selected', text: data.selected() } )
         )
           .append( $( '<span/>', { 'class': 'description', text: data.inst } ) );

         $lable.insertAfter( $element );
         $list.insertAfter( $lable );

         ko.computed( {
            disposeWhenNodeIsRemoved: element,
            read: function () {
               var selectedItem = data.selected();
               dic[dic.selectedItem].removeClass( "active" );
               dic[selectedItem].addClass( "active" );
               dic.selectedItem = selectedItem;
               dic.selectedText.text( selectedItem );
            }
         } );
      }
   };

   ko.bindingHandlers["metaText"] = {
      update: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         var content = ko.unwrap( valueAccessor() );
         if ( typeof content == "number" ) {
            ko.bindingHandlers.text.update.call( this, element, function () {
               return content.toLocaleString();
            } );
         } else {
            ko.bindingHandlers.text.update.apply( this, arguments );
         }
      }
   };

   ko.bindingHandlers["resizeText"] = {
      init: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         var maxWidth = valueAccessor().maxWidth,
             maxSize = valueAccessor().size.max,
             minSize = valueAccessor().size.min, size = maxSize, lastWidth = 0;
         var observable = allBindingsAccessor().text;

         if ( !ko.isObservable( observable ) ) {
            observable = ko.observable( observable );
         }

         var subscription = observable.subscribe( function () {
            //Task.run( function () {
            var el, width = ( el = $( element ) ).width();
            while ( width > maxWidth && size > minSize ) {
               size -= .025;
               width = el.css( { 'fontSize': size + 'em' } ).width();
               lastWidth = width;
            }
            if ( lastWidth > width ) {
               size = maxSize;
               width = el.css( { 'fontSize': size + 'em' } ).width();

               while ( width > maxWidth && size > minSize ) {
                  size -= .025;
                  width = el.css( { 'fontSize': size + 'em' } ).width();
                  lastWidth = width;
               }
            }
            //} );
         } );

         ko.utils.domNodeDisposal.addDisposeCallback( element, function () {
            subscription.dispose();
         } );
      }
   }

   ko.bindingHandlers["search"] = {
      init: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         element.addEventListener( "search", function ( e ) {
            valueAccessor().call( viewModel, e );
         } );
      }
   };

   ko.bindingHandlers["loadMore"] = {
      init: function ( element, valueAccessor, all, vm ) {
         var loadMore = ko.unwrap( valueAccessor() );
         var MARGIN = 10;
         var lastCh = $( ':last', element );

         var dettach = function () {
            $( app.el ).off( "scroll", scrollCheck );
         }

         var attach = function () {
            $( app.el ).on( "scroll", scrollCheck );
         }

         var scrollCheck = function () {
            if ( !lastCh.length ) {
               lastCh = $( ':last', element );
               if ( !lastCh.length ) return;
            }
            var visible = app.el.clientHeight + MARGIN > lastCh.offset().top;
            if ( visible ) {
               dettach();
               loadMore.call( vm ).then( function ( canLoad ) {
                  if ( canLoad ) {
                     attach();
                  }
               } );
            }
         };

         ko.utils.domNodeDisposal.addDisposeCallback( element, dettach );
         attach();
      }
   }

   ko.bindingHandlers["tab"] = {
      init: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         var obj = valueAccessor(), lastIndex = undefined;

         var activeIndex = ko.observable( lastIndex ),
            items = $( element ).find( 'li:not(:last)' ).each( function ( index, el ) {
               $( this ).data( 'index', index );
            } ).click( function () {
               activeIndex( $( this ).data( 'index' ) );

               app.Sound.play( app.Sound.sounds.click.button );
            } );

         $( element ).addClass( 'anim anim-hidden' );

         var animDuration = 500;

         var sub = activeIndex.subscribe( function ( index ) {
            for ( var i = 0; i < items.length; i++ ) {
               items[i].classList.remove( 'active' );
            }
            items[index].classList.add( 'active' );

            if ( typeof obj.nav == "function" ) {
               var dfd = $.Deferred();

               $( element ).removeClass( 'anim-visible' ).delay( animDuration ).promise().then( function () {
                  if ( index != activeIndex() ) {
                     dfd.reject();
                  } else {
                     dfd.resolve( index );
                  }
               } );

               var compose = obj.nav.call( viewModel, index, dfd );
               if ( !compose.then ) {
                  $.Deferred( function ( dfd2 ) {
                     system.acquire( compose.moduleId ).then( function ( module ) {
                        var model = system.resolveObject( module );
                        var oldFn = model.compositionComplete;

                        model.compositionComplete = function () {
                           if ( oldFn ) oldFn.apply( model, arguments );
                           dfd2.resolve();
                        }

                        dfd.then( function () {
                           compose.acquired( model );
                        } );
                     } );
                  } ).promise( compose );
               }

               compose.then( function () {
                  $( element ).addClass( 'anim-visible' ).delay( animDuration ).promise().then( function () {
                     if ( typeof obj.navEnd == "function" ) {
                        obj.navEnd.call( viewModel, index );
                     }
                     if ( typeof obj.navSwitch == "function" ) {
                        obj.navSwitch.call( viewModel, lastIndex, index );
                     }
                     lastIndex = index;
                  } );
               } );
            }
         } );

         ko.utils.domNodeDisposal.addDisposeCallback( element, function () {
            sub.dispose();
            if ( typeof obj.navSwitch == "function" ) {
               obj.navSwitch.call( viewModel, activeIndex() );
            }
         } );

         activeIndex( obj.activeTab || 0 );
      }
   };

   var clickInit = ko.bindingHandlers.click.init;

   ko.bindingHandlers["click"].init = function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
      if ( $.support.touch ) {
         $( element ).bind( "touchstart", function ( e ) {
            //e.preventDefault();
            e.stopPropagation();
         } );

         $( element ).touchPunch();

         element.onlyClick = function ( event ) {
            if ( valueAccessor().apply( viewModel, [viewModel, event] ) !== true ) {
               event.preventDefault();
            }
         }
      }
      else {
         clickInit.apply( this, arguments );
      }
   };

   ko.bindingHandlers["pointer"] = {
      init: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         var value = valueAccessor();

         if ( value.enter )
            element.addEventListener( $.support.touch ? "touchenter" : "mouseenter", function ( event ) {
               value.enter.call( viewModel, event );
            } );
         if ( value.leave )
            element.addEventListener( $.support.touch ? "touchleave" : "mouseleave", function ( event ) {
               value.leave.call( viewModel, event );
            } );
         if ( value.drop )
            element.addEventListener( $.support.touch ? "touchend" : "mouseup", function ( event ) {
               value.drop.call( viewModel, event );
            } );
      }
   };

   ko.bindingHandlers["verifiableValue"] = {
      init: function ( element, valueAccessor, allBindingsAccessor ) {
         ko.bindingHandlers.value.init( element, valueAccessor, allBindingsAccessor );
      },
      update: function ( element, valueAccessor ) {
         ko.bindingHandlers.value.update( element, valueAccessor );
         element.setCustomValidity( valueAccessor().validationMessage() || '' );
      }
   };

   ko.bindingHandlers["verifiableSubmit"] = {
      init: function ( element, valueAccessor, allBindingsAccessor, viewModel ) {
         ko.utils.registerEventHandler( element, "submit", function ( event ) {
            for ( var name in viewModel ) {
               var item = viewModel[name];
               if ( ko.isObservable( item ) && item.validate ) {
                  item.validate();
               }
            }

            if ( !element.checkValidity() || valueAccessor().call( viewModel, element ) !== true ) {
               event.preventDefault();
            }
         } );
      }
   };

   ko.extenders["required"] = function ( target, data ) {
      SetupValidation( "required", target, function ( target, newValue, overrideMessage ) {
         return newValue ? "" : overrideMessage || "This field is required";
      }, data );

      return target;
   };

   ko.extenders["stringLength"] = function ( target, data ) {
      SetupValidation( "stringLength", target, function ( target, newValue, rule ) {
         return newValue.length >= rule.minLength ? "" : rule.message || "min length is " + rule.minLength;
      }, data );

      return target;
   };

   ko.extenders["customValidation"] = function ( target, data ) {
      SetupValidation( "stringLength", target, function ( target, newValue, customFunc ) {
         return customFunc( newValue );
      }, data );

      return target;
   };

   function SetupValidation( ruleName, target, validateFunc, data ) {
      if ( !target.hasOwnProperty( "validate" ) ) {
         target.rules = {};
         target.hasError = ko.observable();
         target.validationMessage = ko.observable();
         target.validate = function () { validate( target() ); };
         target.subscribe( validate );
      }

      target.rules[ruleName] = {
         validate: validateFunc,
         data: data
      };

      function validate( newValue ) {
         for ( var ruleName in target.rules ) {
            var rule = target.rules[ruleName];
            var validationMessage = rule.validate( target, newValue, rule.data );

            if ( validationMessage ) {
               target.hasError( true );
               target.validationMessage( validationMessage );
               return;
            }
         }
         target.hasError( false );
         target.validationMessage( '' );
      }
   }
} );