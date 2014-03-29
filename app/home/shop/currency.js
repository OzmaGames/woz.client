define(['durandal/app', 'api/datacontext'], function (app, ctx) {

   function Currency() {

      var base = this;

      this.list = [
         {
            besoz: 8,
            price: '7 kr',
            discount: 0,
            flag: null
         }, {
            besoz: 50,
            price: '35 kr',
            discount: 25,
            flag: null
         }, {
            besoz: 110,
            price: '70 kr',
            discount: 0,
            flag: null
         }, {
            besoz: 240,
            price: '140 kr',
            discount: 50,
            flag: null
         }, {
            besoz: 650,
            price: '350 kr',
            discount: 0,
            flag: null
         }, {
            besoz: 1500,
            price: '686 kr',
            discount: 90,
            flag: {
               text: 'Best Buy!',
               color: 'yellow'
            }
         }
      ];
   }

   return Currency;
});