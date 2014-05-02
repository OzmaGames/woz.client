﻿define( 'api/datacontext.shop', ['durandal/app', './datacontext.storage'], function ( app, Storage ) {

   var version = 0.1;

   function Shop() {
      var base = this, _user, storage;

      this.loading = ko.observable( false );

      this.collections = ko.observableArray();
      this.collections.load = function () {
         if ( base.collections().length ) return true;

         base.loading( true );
         app.trigger( "server:shop:collections", {}, function ( data ) {
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
         if ( base.besozes().length ) return;

         base.loading( true );
         app.trigger( "server:shop:besoz", {}, function ( data ) {
            base.besozes( data );
            base.loading( false );
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
         app.trigger( "server:shop:storageSpace", {}, function ( data ) {
            base.storageSpaceList( data );
            base.loading( false );
         } );
      }
      this.storageSpaceList.buy = function ( storageSpace ) {
         return $.Deferred( function ( dfd ) {
            base.loading( true );

            obj.id = storageSpace.id;
            obj.command = "buy";
            obj.username = user.username;
            app.trigger( "server:shop:storageSpace", obj, function ( json ) {
               if ( json.success ) {
                  dfd.resolve( obj );
               } else {
                  dfd.reject( obj );
               }
               base.loading( false );
            } );
         } )
      }

      app.on( "server:shop:storageSpace", function ( data, func ) {
         func( [
            { id: 0, text: '20 games', besoz: 10, flag: null },
            { id: 1, text: '40 games', besoz: 20, flag: null },
            { id: 2, text: '60 games', besoz: 30, flag: null },
            { id: 3, text: '80 games', besoz: 40, flag: null },
            { id: 4, text: '100 games', besoz: 50, flag: null },
            { id: 5, text: 'unlimited games', besoz: 200, flag: { color: 'yellow', text: 'Best Buy!' } }
         ] );         
      } );          
      
   }

   return new Shop();
} );