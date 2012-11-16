# datafist

datafist is an interactive environment for manipulating and visualizing your
data streams. It uses:

- [d3.js](LINK) for visualization;
- [mootools](LINK) for other general JavaScript-y goodness;
- [HTML5 File API](LINK) for data import/export; and
- [HTML5 Local Storage](LINK) for session persistence.

You can test datafist out [here](LINK).

## read

datafist consists of *sources*, *channels*, *views*, and *operations*.
With these basic building blocks, you can explore your data in-browser.
Many of these blocks have visual representations in datafist, and can be
manipulated directly from the datafist interface.

### sources

A source is a file, API endpoint, or other place to get data from.

### channels

A channel is a sequence of time-value pairs from a particular source.
When you import a source, it is converted to one or more channels.

### views

A view is an interactive visual representation of one or more channels.

### operations

An operation takes a channel and produces a new channel that is modified in
some way.

## speak

All datafist operations have corresponding representations in fist, the
datafist language. Despite the learning curve, speaking fist has two main
advantages over visual manipulation:

- *Powerful*: with fist, you can quickly modify existing visualizations or
  create new ones from scratch.
- *Shareable*: you can share the fist representations of your visualizations
  with others.

### types

#### primitives

fist builds on JavaScript, using the following built-in types:

- *Boolean* (for true/false data)
- *Number* (for real-valued data)
- *String* (mostly for categorical or semantic data)
- *Date* (for timestamps, which are always converted to JS-style epoch
  milliseconds)
- *Coordinates* (for locations, following the HTML5 specification)

#### sources

TODO: implement OAuth API sources

#### channels

Many web services offer export mechanisms or APIs for accessing your data.
That data is often provided as a sequence of objects encoded in some popular
format (CSV, JSON, XML, etc.):

    {
      "timestampMs": 1234567890000,
      "activeScore": 1729,
      "weight": 170,
      "mood": "beleaguered",
      "location": {
        "latitude": 6.0,
        "longitude": 73.0
      }
    }

When you import a source, it is split into channels by the following process:

- the timestamp field is automatically identified and used as the time;
- any geolocation-related fields are bundled into a Coordinates object as the
  value for one channel;
- any other fields are used as separate channels.

### region

A Region is a closed portion of the plane, described as a sequence of points:

    [
      [1, 2],
      [3, 4],
      [5, 2]
    ]

The last point connects to the first point. Usually, you will not directly
define regions; instead, you will create them graphically by dragging around
areas in a view.

### generators

fist provides generators for producing test data and channels.

#### data

    (choice choice1 ... choiceN)
    (uniform min max)
    (gaussian mu sigma)

#### channels

    (gen-regular t1 t2 n)
    (gen-uniform t1 t2 density)
    (gen-poisson t1 t2 rate)

These are applied to data generators. For instance,

    ((gen-regular 0 60 10) (choice "foo" "bar" "baz"))

produces a channel with 10 time-value pairs, with times spaced equally
from 0ms to 60ms after the epoch and values chosen randomly from the three
strings listed.

### views

There are several views:

    (view-histogram c1)               ; Number
    (view-channel c1 ... cN)          ; Number, ..., Number
    (view-map c1 ... cN)              ; Coordinates, ..., Coordinates
    (view-linregress c1 c2)           ; Number, Number
    (view-bubbles c1 c2)              ; Number, String
    (view-trendalyzer c1 c2 c3 c4)    ; Number, Number, Number, String

display renders the view to the viewer pane:

    (display v)

To show multiple views at once, you can use split-pane composite views:

    (vsplit v1 v2)
    (hsplit v1 v2)
    (vsplit v1 (hsplit v2 v3))

### operations

#### arithmetic

You can apply arithmetic operations to times and values:

    (+ 1 2)               ; 3
    (- today "1 day")     ; yesterday

Unary minus takes the negative value:

    (- 5)                 ; -5
    (- c)                 ; new channel with 

You can also apply them to channels, where they manipulate the values:

    (* c 5)               ; new channel with values multiplied by 5
    (+ c1 c2)             ; new channel with summed values
    (- c2 c1)             ; same as (+ c2 (- c1))

There are two types of division and a modulus operator:

    (/ 17 5)              ; 3.4
    (// 17 5)             ; 3
    (% 17 5)              ; 2

Finally, there is the special "bucket operator":

    (//* 17 5)             ; 15, or (* (// 17 5) 5)

#### math

There are a few simple mathematical operations, which can again be applied
to numbers or channels:

    (sqrt 49)             ; 7
    (pow c 3)             ; new channel with cubed values
    (exp 2 20)            ; 1048576
    (log c)               ; new channel with log-scaled values
    (floor 2.1)           ; 2
    (round c)             ; new channel with rounded values
    (ceil 2.1)            ; 3

#### string

For normalizing string data, there are a few string operations which can
be applied to strings or channels:

    (lower "TeSt")        ; "test"
    (upper "tEsT")        ; "TEST"
    (strip "  test  ")    ; "test"

timedelta converts strings describing differences in time to a value in
milliseconds:

    (timedelta "day")     ; 86400000
    (timedelta "1 day")   ; 86400000
    (timedelta "-1 day")  ; -86400000

#### channel

Arithmetic and mathematical operations act on channel values, but you may
wish to operate on channel timestamps. You can time-shift a channel:

    (time+ c 86400000)    ; new channel time-shifted one day forward
    (time+ c -86400000)   ; new channel time-shifted one day backwards

You can apply a bucketing operation to the timestamps:
    
    (time "second" c)     ; try also "minute", "hour"
    (time "day" c)        ; try also "week", "month", "year"   
    (time 30000 c)        ; quantize in half-minute chunks

There are also a few special bucketing operations that produce channels whose
values correspond to the buckets:

    (bucket-hour c)       ; new channel with values as 0, ..., 23
    (bucket-day c)        ; new channel with values as "Sun", ..., "Sat"
    (bucket-month c)      ; new channel with values as "Jan", ..., "Dec"

Since arithmetic operations on channels require matching timestamps, you can
produce a "default-filled" channel which will return a default value for any
missing timestamp:

    (fill c 42)
    (fill c "Unknown")

You can also use fill with a data generator:

    (fill c (uniform -1 1))

### filters 

#### comparison

You can apply cutoff values to channels:

    (< number)
    (<= number)
    (>= number)
    (> number)

You can also filter channels by equality with a specific value:

    (= value)
    (!= value)

#### time

You can filter channels by time:

    (since date)
    (until date)
    (between date1 date2)

#### location

Location-valued channels can be filtered in a number of ways. You can
filter by distance from a point:

    (distance< coordinates radius)
    (distance>= coordinates radius)

You can filter by latitude, longitude, or altitude:

    (lat< coordinates lat)
    (lat>= coordinates lat)
    (lng< coordinates lng)
    (lng> coordinates lng)

####

Finally, you can logically combine filters:

    (not filter)
    (and filter1 ... filterN)
    (or filter1 ... filterN)

To use a filter, apply it to a channel:

    ((< 3) c)
    ((or (< 3) (> 9000)) c)

#### region

You can also filter by region:
    
    (inside-region region)
    (outside-region region)

Region filters are applied either to a single location-valued channel or to
a pair of number-valued channels:

    ((inside-region region) c)
    ((outside-region region) c1 c2)

When applied to a pair of number-valued channels, a region filter produces
a pair of filtered number-valued channels.

### maps

The various arithmetic, mathematical, and channel operations can be used
to map channel values or timestamps.

### reduces

These group together values with matching timestamps.

    (reduce-exists c)
    (reduce-count c)
    (reduce-min c)
    (reduce-avg c)
    (reduce-max c)
    (reduce-sum c)

## write

The datafist source is available [here](LINK).

TODO: details on making datafist plugins
