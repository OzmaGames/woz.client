define( 'api/context/shop', ['durandal/app', './storage'], function ( app, Storage ) {

   var version = 0.1, rDFD = $.Deferred().resolve().promise();

   function Shop() {
      var base = this, _user, storage;

      this.loading = ko.observable( false );

      this.collections = ko.observableArray();
      this.collections.load = function () {
         if ( base.collections().length ) return true;

         base.loading( true );
         app.trigger( "server:shop:collections", {username: ctx.username}, function ( data ) {
            ko.utils.arrayForEach( data, function ( d ) {
                d.price = +d.price;
                d.shortDescription = d.shortDescription || d.description;
                d.longDescription = d.longDescription || d.description;
                d.example = ('"' + (d.example || "") + '"');
                d.example = d.example == '""' ? '' : d.example;
                d.description = d.description || d.shortDescription || '';
                ko.utils.arrayForEach(d.boosters, function (d) {
                    d.shortDescription = d.shortDescription || d.description;
                    d.longDescription = d.longDescription || d.description;
                    d.description = d.description || d.shortDescription || '';
                    d.example = ('"' + (d.example || "") + '"');
                    d.example = d.example == '""' ? '' : d.example;
                });
            } );
            base.collections( data );
            base.loading( false );
         } );
      }
      this.collections.buy = function ( user, obj ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            obj.command = "buy";
            obj.username = user.username;
            app.trigger( "server:shop:collections", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }

      this.besozes = ko.observableArray();
      this.besozes.load = function () {
         if ( base.besozes().length ) return rDFD;

         return $.Deferred( function ( dfd ) {
            base.loading( true );
            app.trigger( "server:shop:besoz", {}, function ( data ) {
               base.besozes( data );
               base.loading( false );
               dfd.resolve( data );
            } );
         } );
      }
      this.besozes.buy = function ( user, obj ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            obj.command = "buy";
            obj.username = user.username;
            app.trigger( "server:shop:besoz", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }



      this.storageSpaceList = ko.observableArray();
      this.storageSpaceList.load = function () {
         if ( base.storageSpaceList().length ) return;

         base.loading( true );
         app.trigger( "server:shop:storage", {}, function ( data ) {
            for ( var i = 0; i < data.length; i++ ) {
               data[i].text = data[i].storage + ' games';
               if ( data[i].storage == 0 ) {
                  data[i].text = 'unlimited games';
               }
            }
            base.storageSpaceList( data );
            base.loading( false );
         } );
      }
      this.storageSpaceList.buy = function ( user, storageSpace ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            var obj = {
               amount: storageSpace.storage,
               command: "buy",
               username: user.username
            };

            app.trigger( "server:shop:storage", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }

      //app.on( "server:shop:storage", function ( data, func ) {
      //   func( [
      //      { id: 0, text: '20 games', besoz: 10, flag: null },
      //      { id: 1, text: '40 games', besoz: 20, flag: null },
      //      { id: 2, text: '60 games', besoz: 30, flag: null },
      //      { id: 3, text: '80 games', besoz: 40, flag: null },
      //      { id: 4, text: '100 games', besoz: 50, flag: null },
      //      { id: 5, text: 'unlimited games', besoz: 200, flag: { color: 'yellow', text: 'Best Buy!' } }
      //   ] );         
      //} );          

   }

   return new Shop();
} );