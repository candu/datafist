LESS = lessc
LESS_FLAGS = --verbose
JS_UGLIFY = uglifyjs

all: \
  less \
  js

less: css/less/main.css css/less/modal.css css/less/tooltip.css css/less/view.css css/less/docs.css css/less/test.css

css/less/%.css: less/%.less
	$(LESS) $(LESS_FLAGS) $< $@

js: js/fist.js

js/fist.js: \
  js/src/Iterator.js \
  js/src/Heap.js \
  js/src/Region.js \
  js/src/Type.js \
  js/src/SExp.js \
  js/src/Utils.js \
  js/src/DataImporter.js \
  js/src/Fist.js \
  js/src/LibFist.js \
  js/src/FistUI.js \
  js/src/LibFistUI.js
	cat $(filter %.js,$^) > $@.tmp
	$(JS_UGLIFY) $@.tmp -b indent-level=2 -o $@
	rm $@.tmp

clean:
	rm css/less/*.css js/fist.js
