/*
 * Common JavaScript functions used for forms.
 */
   function KSU_getElement(evt) {
       evt = (evt) ? evt : ((event) ? event : null);
       if (evt) {
           return (evt.target) ? evt.target : ((evt.srcElement) ? evt.srcElement : null);
       }
       return null;
   }
   function KSU_clearDefault(evt) {
       var elem = KSU_getElement(evt);
       if (elem && elem.value==elem.defaultValue) {
           elem.value = "";
       }
   }
   function KSU_restoreDefault(evt) {
       var elem = KSU_getElement(evt);
       if (elem && elem.value=="") {
           elem.value = elem.defaultValue;
       }
   }
