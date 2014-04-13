define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function ctor() {
      this.collections = [
         {
            name: 'Zen',
            flag: {
               text: 'Featured!',
               color: 'yellow'
            },            
            types: [
               {
                  type: 'starter',
                  name: 'Starter',
                  description: 'Beautiful images to enhance your poetic talents. Be prepared to chill!',
                  tiles: 20,
                  words: 100,
                  besoz: 65
               },
               {
                  type: 'booster',
                  name: 'Breeze',
                  description: 'An epic nature adventure awaits! Nature has inspired poets for ages. Now it\'s your turn!',
                  tiles: 10,
                  words: 40,
                  besoz: 30
               }
            ]
         },
         {
            name: 'Gothic',
            flag: {
               text: 'New!',
               color: 'blue'
            },
            types: [
               {
                  type: 'starter',
                  name: 'Horror',
                  description: 'This gothic horror expansion will let your imagination run wild! Can you sleep tonight?',
                  tiles: 10,
                  words: 40,
                  besoz: 30
               },
               {
                  type: 'booster',
                  name: 'Romantic',
                  description: 'Lorem...',
                  tiles: 15,
                  words: 50,
                  besoz: 40
               }
            ]
         },
         {
            name: 'Vintage',
            flag: null,
            types: [
               {
                  type: 'starter',
                  name: 'Quirky',
                  description: 'Open up to tge quirkiness of the old times - Get a good laugh as you embrace the unexpected!',
                  tiles: 10,
                  words: 40,
                  besoz: 99
               },
               {
                  type: 'booster',
                  name: 'Golden',
                  description: 'Lorem...',
                  tiles: 15,
                  words: 50,
                  besoz: 49
               }
            ]
         }
      ];
   }

   return ctor;
});