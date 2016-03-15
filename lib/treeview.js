/*
  Angular2 Component.
*/

/* globals ng */

let TreeView = ng.core.Component({
    selector: 'treeview',
    inputs: ['src', 'node_click', 'node_print', 'selected', 'match'],
    directives: [ng.core.forwardRef(function() { return TreeView })],
    template:`
<ul class="treeview-node"
    [class.hidden]="src?.parent && !selected?.ascendant_of(src)">
  <li *ngFor="#tnode of src?.kids">
    <span *ngIf="tnode.kids.length"
	  (click)="toggle_view($event)" class="{{ sign(tnode) }}">
    </span>

    <span (click)="node_click ? node_click($event, tnode) : stub_node_click($event, tnode)"
	  [class.selected]="match && match(tnode, selected)"
	  [class.leaf]="tnode.kids.length == 0">
      {{ node_print ? node_print(tnode) : tnode.name }}
    </span>

    <treeview [src]="tnode" [node_click]="node_click" [node_print]="node_print"
	      [selected]="selected" [match]="match"></treeview>
  </li>
</ul>
`,
}).Class({
    constructor: [ng.router.Router, function(router) {
	console.log('TreeView: constructor')
	this.router = router
    }],

    stub_node_click: function(event, tnode) {
	alert(tnode.name)
    },

    sign: function(parent) {
	if (!(this.selected)) return "treeview__sign--collapsed"
	return this.selected.ascendant_of(parent) ? "treeview__sign--expanded" : "treeview__sign--collapsed"
    },

    toggle_view: function(e) {
	window.q = e.target
	e.target.classList.toggle('treeview__sign--expanded')
	e.target.classList.toggle('treeview__sign--collapsed')
	e.target.nextElementSibling.nextElementSibling.children[0]
	    .classList.toggle('hidden') // next <treeview>
    }

})

module.exports = TreeView
