!function(a){a.widget("ui.tagit",{options:{allowDuplicates:!1,caseSensitive:!0,fieldName:"tags",placeholderText:null,readOnly:!1,removeConfirmation:!1,tagLimit:null,availableTags:[],autocomplete:{},showAutocompleteOnFocus:!1,allowSpaces:!1,singleField:!1,singleFieldDelimiter:",",singleFieldNode:null,animate:!0,tabIndex:null,beforeTagAdded:null,afterTagAdded:null,beforeTagRemoved:null,afterTagRemoved:null,onTagClicked:null,onTagLimitExceeded:null,onTagAdded:null,onTagRemoved:null,tagSource:null},_create:function(){var b=this;this.element.is("input")?(this.tagList=a("<ul></ul>").insertAfter(this.element),this.options.singleField=!0,this.options.singleFieldNode=this.element,this.element.addClass("tagit-hidden-field")):this.tagList=this.element.find("ul, ol").andSelf().last(),this.tagInput=a('<input type="text" />').addClass("ui-widget-content"),this.options.readOnly&&this.tagInput.attr("disabled","disabled"),this.options.tabIndex&&this.tagInput.attr("tabindex",this.options.tabIndex),this.options.placeholderText&&this.tagInput.attr("placeholder",this.options.placeholderText),this.options.autocomplete.source||(this.options.autocomplete.source=function(b,c){var d=b.term.toLowerCase(),e=a.grep(this.options.availableTags,function(a){return 0===a.toLowerCase().indexOf(d)});this.options.allowDuplicates||(e=this._subtractArray(e,this.assignedTags())),c(e)}),this.options.showAutocompleteOnFocus&&(this.tagInput.focus(function(a,c){b._showAutocomplete()}),"undefined"==typeof this.options.autocomplete.minLength&&(this.options.autocomplete.minLength=0)),a.isFunction(this.options.autocomplete.source)&&(this.options.autocomplete.source=a.proxy(this.options.autocomplete.source,this)),a.isFunction(this.options.tagSource)&&(this.options.tagSource=a.proxy(this.options.tagSource,this)),this.tagList.addClass("tagit").addClass("ui-widget ui-widget-content ui-corner-all").append(a('<li class="tagit-new"></li>').append(this.tagInput)).click(function(c){var d=a(c.target);if(d.hasClass("tagit-label")){var e=d.closest(".tagit-choice");e.hasClass("removed")||b._trigger("onTagClicked",c,{tag:e,tagLabel:b.tagLabel(e)})}else b.tagInput.focus()});var c=!1;if(this.options.singleField)if(this.options.singleFieldNode){var d=a(this.options.singleFieldNode),e=d.val().split(this.options.singleFieldDelimiter);d.val(""),a.each(e,function(a,d){b.createTag(d,null,!0),c=!0})}else this.options.singleFieldNode=a('<input type="hidden" style="display:none;" value="" name="'+this.options.fieldName+'" />'),this.tagList.after(this.options.singleFieldNode);if(c||this.tagList.children("li").each(function(){a(this).hasClass("tagit-new")||(b.createTag(a(this).text(),a(this).attr("class"),!0),a(this).remove())}),this.tagInput.keydown(function(c){if(c.which==a.ui.keyCode.BACKSPACE&&""===b.tagInput.val()){var d=b._lastTag();!b.options.removeConfirmation||d.hasClass("remove")?b.removeTag(d):b.options.removeConfirmation&&d.addClass("remove ui-state-highlight")}else b.options.removeConfirmation&&b._lastTag().removeClass("remove ui-state-highlight");(c.which===a.ui.keyCode.COMMA&&c.shiftKey===!1||c.which===a.ui.keyCode.ENTER||c.which==a.ui.keyCode.TAB&&""!==b.tagInput.val()||c.which==a.ui.keyCode.SPACE&&b.options.allowSpaces!==!0&&('"'!=a.trim(b.tagInput.val()).replace(/^s*/,"").charAt(0)||'"'==a.trim(b.tagInput.val()).charAt(0)&&'"'==a.trim(b.tagInput.val()).charAt(a.trim(b.tagInput.val()).length-1)&&a.trim(b.tagInput.val()).length-1!==0))&&((c.which!==a.ui.keyCode.ENTER||""!==b.tagInput.val())&&c.preventDefault(),b.options.autocomplete.autoFocus&&b.tagInput.data("autocomplete-open")||(b.tagInput.autocomplete("close"),b.createTag(b._cleanedInput())))}).blur(function(a){b.tagInput.data("autocomplete-open")||b.createTag(b._cleanedInput())}),this.options.availableTags||this.options.tagSource||this.options.autocomplete.source){var f={select:function(a,c){return b.createTag(c.item.value),!1}};a.extend(f,this.options.autocomplete),f.source=this.options.tagSource||f.source,this.tagInput.autocomplete(f).bind("autocompleteopen.tagit",function(a,c){b.tagInput.data("autocomplete-open",!0)}).bind("autocompleteclose.tagit",function(a,c){b.tagInput.data("autocomplete-open",!1)}),this.tagInput.autocomplete("widget").addClass("tagit-autocomplete")}},destroy:function(){return a.Widget.prototype.destroy.call(this),this.element.unbind(".tagit"),this.tagList.unbind(".tagit"),this.tagInput.removeData("autocomplete-open"),this.tagList.removeClass(["tagit","ui-widget","ui-widget-content","ui-corner-all","tagit-hidden-field"].join(" ")),this.element.is("input")?(this.element.removeClass("tagit-hidden-field"),this.tagList.remove()):(this.element.children("li").each(function(){a(this).hasClass("tagit-new")?a(this).remove():(a(this).removeClass(["tagit-choice","ui-widget-content","ui-state-default","ui-state-highlight","ui-corner-all","remove","tagit-choice-editable","tagit-choice-read-only"].join(" ")),a(this).text(a(this).children(".tagit-label").text()))}),this.singleFieldNode&&this.singleFieldNode.remove()),this},_cleanedInput:function(){return a.trim(this.tagInput.val().replace(/^"(.*)"$/,"$1"))},_lastTag:function(){return this.tagList.find(".tagit-choice:last:not(.removed)")},_tags:function(){return this.tagList.find(".tagit-choice:not(.removed)")},assignedTags:function(){var b=this,c=[];return this.options.singleField?(c=a(this.options.singleFieldNode).val().split(this.options.singleFieldDelimiter),""===c[0]&&(c=[])):this._tags().each(function(){c.push(b.tagLabel(this))}),c},_updateSingleTagsField:function(b){a(this.options.singleFieldNode).val(b.join(this.options.singleFieldDelimiter)).trigger("change")},_subtractArray:function(b,c){for(var d=[],e=0;e<b.length;e++)-1==a.inArray(b[e],c)&&d.push(b[e]);return d},tagLabel:function(b){return this.options.singleField?a(b).find(".tagit-label:first").text():a(b).find("input:first").val()},_showAutocomplete:function(){this.tagInput.autocomplete("search","")},_findTagByLabel:function(b){var c=this,d=null;return this._tags().each(function(e){return c._formatStr(b)==c._formatStr(c.tagLabel(this))?(d=a(this),!1):void 0}),d},_isNew:function(a){return!this._findTagByLabel(a)},_formatStr:function(b){return this.options.caseSensitive?b:a.trim(b.toLowerCase())},_effectExists:function(b){return Boolean(a.effects&&(a.effects[b]||a.effects.effect&&a.effects.effect[b]))},createTag:function(b,c,d){var e=this;if(b=a.trim(b),this.options.preprocessTag&&(b=this.options.preprocessTag(b)),""===b)return!1;if(!this.options.allowDuplicates&&!this._isNew(b)){var f=this._findTagByLabel(b);return this._trigger("onTagExists",null,{existingTag:f,duringInitialization:d})!==!1&&this._effectExists("highlight")&&f.effect("highlight"),!1}if(this.options.tagLimit&&this._tags().length>=this.options.tagLimit)return this._trigger("onTagLimitExceeded",null,{duringInitialization:d}),!1;var g=a(this.options.onTagClicked?'<a class="tagit-label"></a>':'<span class="tagit-label"></span>').text(b),h=a("<li></li>").addClass("tagit-choice ui-widget-content ui-state-default ui-corner-all").addClass(c).append(g);if(this.options.readOnly)h.addClass("tagit-choice-read-only");else{h.addClass("tagit-choice-editable");var i=a("<span></span>").addClass("ui-icon ui-icon-close"),j=a('<a><span class="text-icon">×</span></a>').addClass("tagit-close").append(i).click(function(a){e.removeTag(h)});h.append(j)}if(!this.options.singleField){var k=g.html();h.append('<input type="hidden" value="'+k+'" name="'+this.options.fieldName+'" class="tagit-hidden-field" />')}if(this._trigger("beforeTagAdded",null,{tag:h,tagLabel:this.tagLabel(h),duringInitialization:d})!==!1){if(this.options.singleField){var l=this.assignedTags();l.push(b),this._updateSingleTagsField(l)}this._trigger("onTagAdded",null,h),this.tagInput.val(""),this.tagInput.parent().before(h),this._trigger("afterTagAdded",null,{tag:h,tagLabel:this.tagLabel(h),duringInitialization:d}),this.options.showAutocompleteOnFocus&&!d&&setTimeout(function(){e._showAutocomplete()},0)}},removeTag:function(b,c){if(c="undefined"==typeof c?this.options.animate:c,b=a(b),this._trigger("onTagRemoved",null,b),this._trigger("beforeTagRemoved",null,{tag:b,tagLabel:this.tagLabel(b)})!==!1){if(this.options.singleField){var d=this.assignedTags(),e=this.tagLabel(b);d=a.grep(d,function(a){return a!=e}),this._updateSingleTagsField(d)}if(c){b.addClass("removed");var f=this._effectExists("blind")?["blind",{direction:"horizontal"},"fast"]:["fast"],g=this;f.push(function(){b.remove(),g._trigger("afterTagRemoved",null,{tag:b,tagLabel:g.tagLabel(b)})}),b.fadeOut("fast").hide.apply(b,f).dequeue()}else b.remove(),this._trigger("afterTagRemoved",null,{tag:b,tagLabel:this.tagLabel(b)})}},removeTagByLabel:function(a,b){var c=this._findTagByLabel(a);if(!c)throw"No such tag exists with the name '"+a+"'";this.removeTag(c,b)},removeAll:function(){var a=this;this._tags().each(function(b,c){a.removeTag(c,!1)})}})}(jQuery);