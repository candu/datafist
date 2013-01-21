LESS = lessc
LESS_FLAGS = --verbose

all: less

less: css/less/elements.css css/less/main.css css/less/modal.css css/less/tooltip.css css/less/view.css

css/less/%.css: less/%.less
	$(LESS) $(LESS_FLAGS) $< $@

clean:
	rm css/less/*.css
