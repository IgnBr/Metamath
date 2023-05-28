const colors = {
  constants: "red",
  variables: "purple",
  floatingHypotheses: "blue",
  axiomaticAssertions: "orange",
  provableAssertions: "green",
};

const shapes = {
  constants: "rect",
  variables: "circle",
  floatingHypotheses: "triangle",
  axiomaticAssertions: "pentagon",
  provableAssertions: "pentagon",
};

const groupNames = {
  constants: "Constants",
  variables: "Variables",
  floatingHypotheses: "Floating Hypotheses",
  axiomaticAssertions: "Axiomatic Assertions",
  provableAssertions: "Provable Assertions",
};

const rect = {
  width: 18,
  height: 18,
};

const circle = {
  r: 9,
};

const triangle = {
  points: "9 0, 18 18, 0 18",
  width: 18,
  height: 18,
};

const vertices = [
  [0.5, 0],
  [1, 0.4],
  [0.8, 1],
  [0.2, 1],
  [0, 0.4],
];

const scaledVertices = vertices
  .map(function (vertex) {
    return [vertex[0] * 18, vertex[1] * 18].join(",");
  })
  .join(" ");

const pentagon = {
  width: 18,
  height: 18,
  points: scaledVertices,
};

treeJSON = (aboutPageData, data, proofsStacks, oldData = {}) => {
  let updateCount = 0;
  const button = document.getElementById("toggle");
  button.removeAttribute("hidden");

  let previousTree = d3.select("svg");
  previousTree.remove();
  let previousButton = d3.select(".dropdown");
  previousButton.remove();
  let previousSearch = d3.select("#search-div");
  previousSearch.remove();

  proofsStacks =
    typeof proofsStacks === "string" ? JSON.parse(proofsStacks) : proofsStacks;
  aboutPageData =
    typeof aboutPageData === "string"
      ? JSON.parse(aboutPageData)
      : aboutPageData;

  d3.select("#about")?.on("click", function (d) {
    var popup = d3
      .select("body")
      .append("div")
      .attr("class", "popup")
      .style("left", "50%")
      .style("top", "50%")
      .style("transform", "translate(-50%, -50%)")
      .on("mousedown", function () {
        d3.event.stopPropagation();
      });

    popup.append("h1").text(aboutPageData.title || "Metamath file");
    aboutPageData.description &&
      popup.append("p").text(aboutPageData.description);
    console.log(aboutPageData.contributors.length);
    if (aboutPageData.contributors.length) {
      popup.append("h2").text("Contributors:");
      const ul = popup.append("ul");
      aboutPageData.contributors.forEach((contributor) => {
        ul.append("li").text(contributor.trim());
      });
    }

    var closeButton = popup
      .append("span")
      .attr("class", "close-button")
      .text("X")
      .on("click", function () {
        popup.remove();
      });

    var drag = d3.behavior
      .drag()
      .on("dragstart", function () {
        d3.event.sourceEvent.stopPropagation();
      })
      .on("drag", function () {
        var dx = d3.event.dx;
        var dy = d3.event.dy;
        var left = parseFloat(popup.style("left")) || 0;
        var top = parseFloat(popup.style("top")) || 0;
        popup.style("left", left + dx + "px").style("top", top + dy + "px");
      });
    popup.call(drag);
  });

  let { comments, tree: jsonData } =
    typeof data === "string" ? JSON.parse(data) : data;
  const treeData = jsonData;
  var totalNodes = 0;
  var maxLabelLength = 0;

  const axiomaticSections =
    Object.keys(oldData).length === 0
      ? treeData.children[0].children.map(({ section }) => section)
      : oldData.tree.children[0].children.map(({ section }) => section);
  const provableSections =
    Object.keys(oldData).length === 0
      ? treeData.children[1].children.map(({ section }) => section)
      : oldData.tree.children[1].children.map(({ section }) => section);

  const selectedAxiomaticSections = treeData.children[0].children.map(
    ({ section }) => section
  );

  const selectedProvableSections = treeData.children[1].children.map(
    ({ section }) => section
  );

  const sections = new Set(axiomaticSections.concat(provableSections));
  let selectedSections = Array.from(
    new Set(selectedAxiomaticSections.concat(selectedProvableSections))
  );
  const originalSections = [...selectedSections];
  const dropdownOptions = Array.from(sections);

  var dropdownButton = d3
    .select("#tree-container")
    .append("div")
    .attr("class", "dropdown");

  dropdownButton
    .append("button")
    .attr("class", "dropdown-toggle")
    .attr("type", "button")
    .text("Select Sections")
    .attr("data-toggle", "dropdown");

  var dropdownMenu = dropdownButton
    .append("div")
    .attr("class", "dropdown-menu")
    .style("display", "none");

  var checkboxGroup = dropdownMenu
    .selectAll("label")
    .data(dropdownOptions)
    .enter()
    .append("label");

  checkboxGroup
    .append("input")
    .attr("type", "checkbox")
    .attr("class", "dropdown-checkbox")
    .attr("value", function (d) {
      return d;
    })
    .property("checked", function (d) {
      return selectedSections.includes(d);
    })
    .on("change", function (d) {
      if (this.checked) {
        selectedSections.push(d);
      } else {
        let index = selectedSections.indexOf(d);
        if (index !== -1) {
          selectedSections.splice(index, 1);
        }
      }
    });

  checkboxGroup
    .append("span")
    .text(function (d) {
      return d;
    })
    .append("br");

  var searchDiv = d3
    .select("#main-selection")
    .append("div")
    .attr("id", "search-div");

  searchDiv
    .append("input")
    .attr("type", "search")
    .attr("id", "search-input")
    .attr("placeholder", "Search in visualization...");

  const searchButton = searchDiv
    .append("button")
    .attr("class", "search-button")
    .on("click", function () {
      const searchValue = document.getElementById("search-input")?.value;
      if (!searchValue || searchValue === "") {
        return;
      }
      searchDiv.style("padding-bottom", "0");
      searchMatchedText.style("display", "block");
      const nodes = tree.nodes(root).reverse();
      const filteredNodes = nodes.filter(
        ({ value, name }) => name.includes(searchValue) && value
      );

      if (searchValue !== currentSearchResults?.query) {
        currentSearchResults = {
          query: searchValue,
          nodes: filteredNodes,
          currentResult: 0,
        };
      } else {
        if (
          currentSearchResults.currentResult <
          currentSearchResults.nodes.length - 1
        ) {
          currentSearchResults.currentResult++;
        } else {
          currentSearchResults.currentResult = 0;
        }
      }
      if (filteredNodes[currentSearchResults.currentResult]) {
        searchMatchedText.text(
          `Displaying ${currentSearchResults.currentResult + 1} of ${
            currentSearchResults.nodes.length
          } matches`
        );
        centerNode(filteredNodes[currentSearchResults.currentResult]);
      } else {
        searchMatchedText.text("There are no matches");
      }
    });

  searchButton.append("span").attr("class", "search-icon");
  let currentSearchResults;
  const searchMatchedText = searchDiv
    .append("div")
    .attr("id", "search-matches")
    .text("Displaying 1 of 2 matches");

  dropdownButton.select(".dropdown-toggle").on("click", function () {
    var menu = dropdownButton.select(".dropdown-menu");
    var isVisible = menu.style("display") === "block";
    menu.style("display", isVisible ? "none" : "block");
    if (
      isVisible &&
      (originalSections.filter((s) => !selectedSections.includes(s)).length !==
        0 ||
        (originalSections.length === 0 && selectedSections.length > 0) ||
        originalSections.length < selectedSections.length)
    ) {
      const newData =
        Object.keys(oldData).length === 0
          ? typeof data === "string"
            ? JSON.parse(data)
            : JSON.parse(JSON.stringify(data))
          : JSON.parse(JSON.stringify(oldData));

      const axiomaticAssertions = newData.tree.children[0].children.flatMap(
        (a) => (selectedSections.includes(a.section) ? [a] : [])
      );
      const provableAssertions = newData.tree.children[1].children.flatMap(
        (a) => (selectedSections.includes(a.section) ? [a] : [])
      );

      newData.tree.children[0].children = axiomaticAssertions;
      newData.tree.children[1].children = provableAssertions;

      treeJSON(
        aboutPageData,
        newData,
        proofsStacks,
        Object.keys(oldData).length === 0
          ? typeof data === "string"
            ? JSON.parse(data)
            : data
          : oldData
      );
    }
  });

  d3.select("body").on("click", function () {
    if (!dropdownButton.node().contains(event.target)) {
      dropdownButton.select(".dropdown-menu").style("display", function () {
        const currentDisplayOption = window
          .getComputedStyle(this)
          .getPropertyValue("display");
        if (
          currentDisplayOption !== "none" &&
          (originalSections.filter((s) => !selectedSections.includes(s))
            .length !== 0 ||
            (originalSections.length === 0 && selectedSections.length > 0) ||
            originalSections.length < selectedSections.length)
        ) {
          const newData =
            Object.keys(oldData).length === 0
              ? typeof data === "string"
                ? JSON.parse(data)
                : JSON.parse(JSON.stringify(data))
              : JSON.parse(JSON.stringify(oldData));

          const axiomaticAssertions = newData.tree.children[0].children.flatMap(
            (a) => (selectedSections.includes(a.section) ? [a] : [])
          );
          const provableAssertions = newData.tree.children[1].children.flatMap(
            (a) => (selectedSections.includes(a.section) ? [a] : [])
          );

          newData.tree.children[0].children = axiomaticAssertions;
          newData.tree.children[1].children = provableAssertions;

          treeJSON(
            aboutPageData,
            newData,
            proofsStacks,
            Object.keys(oldData).length === 0
              ? typeof data === "string"
                ? JSON.parse(data)
                : data
              : oldData
          );
        }
        return "none";
      });
    }
  });
  var i = 0;
  var duration = 750;
  var root;

  var viewerWidth = document.getElementById("tree-container").offsetWidth;
  var viewerHeight = document.getElementById("tree-container").offsetHeight;

  var tree = d3.layout.tree().size([viewerHeight, viewerWidth]);

  var diagonal = d3.svg.diagonal().projection(function (d) {
    return [d.x, d.y];
  });

  function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
      var count = children.length;
      for (var i = 0; i < count; i++) {
        visit(children[i], visitFn, childrenFn);
      }
    }
  }

  visit(
    treeData,
    function (d) {
      totalNodes++;
      maxLabelLength = Math.max(d.name.length, maxLabelLength);
    },
    function (d) {
      return d.children && d.children.length > 0 ? d.children : null;
    }
  );

  function zoom() {
    svgGroup.attr(
      "transform",
      "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")"
    );
  }

  var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

  zoomListener.scale(0.6);

  var baseSvg = d3
    .select("#tree-container")
    .append("svg")
    .attr("width", viewerWidth)
    .attr("height", viewerHeight)
    .attr("class", "overlay")
    .call(zoomListener);

  function centerNode(source) {
    var viewerWidth = document.getElementById("tree-container").offsetWidth;
    var viewerHeight = document.getElementById("tree-container").offsetHeight;
    scale = zoomListener.scale();
    x = -source.x0;
    y = -source.y0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;
    d3.select("g")
      .transition()
      .duration(duration)
      .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
  }

  function toggleChildren(d) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else if (d._children) {
      d.children = d._children;
      d._children = null;
    }
    return d;
  }

  function click(d) {
    if (d3.event.defaultPrevented) return;
    d = toggleChildren(d);
    update(d);
    centerNode(d);
  }

  function mousehover(d) {
    if (d3.event.defaultPrevented) return;
    if (d.value) {
      const name = d.name;
      d.name = d.value[0];
      d.value[0] = name;
    }
    update(d);
  }

  function update(source) {
    var levelWidth = [1];
    var childCount = function (level, n) {
      if (n.children && n.children.length > 0) {
        if (levelWidth.length <= level + 1) levelWidth.push(0);

        levelWidth[level + 1] += n.children.length;
        n.children.forEach(function (d) {
          childCount(level + 1, d);
        });
      }
    };
    childCount(0, root);
    var newHeight = d3.max(levelWidth) * 25;
    tree = tree.size([newHeight, viewerWidth]);
    tree.nodeSize([1, 1]).separation(function (a, b) {
      var maxTextLength = d3.max([a.name.length, b.name.length]);
      var separation = maxTextLength * 15;
      var extraSeparation = 10;

      return separation + extraSeparation > 100
        ? separation + extraSeparation
        : 100;
    });

    var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

    nodes.forEach(function (d) {
      d.y = d.depth * (maxLabelLength * 10);
    });

    node = svgGroup.selectAll("g.node").data(nodes, function (d) {
      return d.id || (d.id = ++i);
    });

    var nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", function (d) {
        return "translate(" + source.x0 + "," + source.y0 + ")";
      });

    nodeEnter
      .append(function (d) {
        if (shapes[d.group] === "rect") {
          d = { ...d, ...rect };
          return document.createElementNS(d3.ns.prefix.svg, "rect");
        } else if (shapes[d.group] === "circle") {
          d = { ...d, ...circle };
          return document.createElementNS(d3.ns.prefix.svg, "circle");
        } else if (shapes[d.group] === "triangle") {
          d = { ...d, ...triangle };
          return document.createElementNS(d3.ns.prefix.svg, "polygon");
        } else if (shapes[d.group] === "pentagon") {
          d = { ...d, ...pentagon };
          return document.createElementNS(d3.ns.prefix.svg, "polygon");
        }
        return document.createElementNS(d3.ns.prefix.svg, "circle");
      })
      .attr("class", "nodeShape")
      .attr("y", function (d) {
        if (shapes[d.group] !== "circle") return -9;
      })
      .attr("x", function (d) {
        if (shapes[d.group] !== "circle") return -9;
      })
      .attr("transform", function (d) {
        if (shapes[d.group] === "triangle" || shapes[d.group] === "pentagon")
          return "translate(" + -9 + "," + -9 + ")";
      })
      .attr("r", function (d) {
        if (shapes[d.group] === "circle") return 9;
      })
      .attr("width", 18)
      .attr("height", 18)
      .attr("points", function (d) {
        if (shapes[d.group] === "triangle") return triangle.points;
        if (shapes[d.group] === "pentagon") return pentagon.points;
      })
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      })
      .on("click", click);

    nodeEnter
      .append("text")
      .attr("x", function (d) {
        return 15;
      })
      .attr("dy", ".35em")
      .attr("class", "nodeText")
      .attr("text-anchor", function (d) {
        return "start";
      })
      .text(function (d) {
        return d.name;
      })
      .style("fill-opacity", 0)
      .on("mouseover", mousehover)
      .on("mouseout", mousehover)
      .on("click", function (d) {
        if (!d.value?.[0].length || !d.name) {
          return;
        }
        var popup = d3
          .select("body")
          .append("div")
          .attr("class", "popup")
          .style("left", "50%")
          .style("top", "50%")
          .style("transform", "translate(-50%, -50%)")
          .on("mousedown", function () {
            d3.event.stopPropagation();
          });

        popup.append("div").attr("class", "value-placeholder").text(`Value:`);

        popup
          .append("div")
          .attr("class", "value")
          .text(`${d.value[0].length > d.name.length ? d.value[0] : d.name}`);
        const comment = comments.filter(([nameArray, _]) => {
          return nameArray.includes(d.name) || nameArray.includes(d.value?.[0]);
        });

        popup.append("div").attr("class", "group-placeholder").text("Group:");
        popup
          .append("div")
          .attr("class", "syntax-group")
          .text(groupNames[d.group]);

        popup
          .append("div")
          .attr("class", "comment-placeholder")
          .text("Comments:");
        popup
          .append("div")
          .attr("class", "comment")
          .html(
            comment.length > 0
              ? comment.map((comment) => comment[1]).join("<br>")
              : "There are no comments"
          );

        const stack = proofsStacks.find(
          ({ proof }) => proof === d.value?.[0] || proof === d.name
        );

        if (stack) {
          popup.style("min-width", "45%");
          let currentStep = 1;
          const data = [];
          let proof =
            d.value?.[0].trim() === stack.proof ? d.name : d.value?.[0];
          proof = proof.split("$=")[1];
          proof = proof.replace(/\$./g, "");
          const labels = proof.trim().split(" ");
          labels.forEach((label, idx) =>
            data.push({
              label,
              step: d.children.find(({ name }) => name === label).value[0],
              stack: stack.stack[0][idx]
                .map((stackElement) => stackElement.join(" "))
                .join("<br>"),
              floatingHypotheses: stack.stackHypotheses[idx][0]
                .map((stackElement) => stackElement.join(" "))
                .join("<br>"),
              essentialHypotheses: stack.stackHypotheses[idx][1]
                .map((stackElement) => stackElement.join(" "))
                .join("<br>"),
            })
          );

          var proofDiv = popup.append("div").attr("id", "proof-div");
          var navDiv = proofDiv
            .append("div")
            .attr("id", "nav-div")
            .style("align-items", "center");
          var prevButton = navDiv
            .append("button")
            .attr("id", "prev-proof")
            .text("<")
            .on("click", function () {
              if (currentStep > 1) {
                currentStep = currentStep - 1;
                stepNumber.text(`${currentStep}`);
                document.querySelector(
                  `tbody tr:nth-of-type(${currentStep})`
                ).style.display = "table-row";
                document.querySelector(
                  `tbody tr:nth-of-type(${currentStep + 1})`
                ).style.display = "none";
              }
            });
          var nextButton = navDiv
            .append("button")
            .attr("id", "next-proof")
            .text(">")
            .on("click", function () {
              if (currentStep < data.length) {
                currentStep = currentStep + 1;
                stepNumber.text(`${currentStep}`);
                document.querySelector(
                  `tbody tr:nth-of-type(${currentStep})`
                ).style.display = "table-row";
                document.querySelector(
                  `tbody tr:nth-of-type(${currentStep - 1})`
                ).style.display = "none";
              }
            });

          navDiv.append("p").text("Step").style("margin", "0px 5px 0px 5px");
          const stepNumber = navDiv
            .append("p")
            .attr("id", "step-number")
            .text("1");

          navDiv
            .append("div")
            .attr("id", "proof-placeholder")
            .text("The Proof Steps");
          var table = proofDiv.append("table").attr("class", "stackTable");
          var thead = table.append("thead");
          thead.append("tr").append("th").text("Label").style("width", "10%");
          thead.select("tr").append("th").text("Step").style("width", "22.5%");
          thead.select("tr").append("th").text("Stack").style("width", "22.5%");
          thead
            .select("tr")
            .append("th")
            .text("Floating Hypotheses")
            .style("width", "22.5%");
          thead
            .select("tr")
            .append("th")
            .text("Essential Hypotheses")
            .style("width", "22.5%");
          var tbody = table.append("tbody");
          var rows = tbody
            .selectAll("tr")
            .data(data)
            .enter()
            .append("tr")
            .style("display", "none");
          var cells = rows
            .selectAll("td")
            .data(function (row) {
              return [
                row.label,
                row.step,
                row.stack,
                row.floatingHypotheses,
                row.essentialHypotheses,
              ];
            })
            .enter()
            .append("td")
            .html(function (d) {
              return d;
            });

          document.querySelector(`tbody tr:nth-of-type(1)`).style.display =
            "table-row";
        }

        var closeButton = popup
          .append("span")
          .attr("class", "close-button")
          .text("X")
          .on("click", function () {
            popup.remove();
          });

        var drag = d3.behavior
          .drag()
          .on("dragstart", function () {
            d3.event.sourceEvent.stopPropagation();
          })
          .on("drag", function () {
            var dx = d3.event.dx;
            var dy = d3.event.dy;
            var left = parseFloat(popup.style("left")) || 0;
            var top = parseFloat(popup.style("top")) || 0;
            popup.style("left", left + dx + "px").style("top", top + dy + "px");
          });
        popup.call(drag);
      });

    node
      .select("text")
      .attr("x", function (d) {
        return 15;
      })
      .attr("text-anchor", function (d) {
        return "start";
      })
      .text(function (d) {
        return d.name;
      })
      .style("fill", function (d) {
        switch (d.group) {
          case "variables":
            return colors.variables;
          case "constants":
            return colors.constants;
          case "floatingHypotheses":
            return colors.floatingHypotheses;
          case "axiomaticAssertions":
            return colors.axiomaticAssertions;
          case "provableAssertions":
            return colors.provableAssertions;
          default:
            return "black";
        }
      });

    nodeEnter
      .append("text")
      .attr("class", "nodeShapeText")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d.group?.[0] || "";
      })
      .attr("fill", "#000")
      .on("click", click);

    node
      .select(".nodeShape")
      .attr("r", 9)
      .style("fill", function (d) {
        return d._children ? "lightsteelblue" : "#fff";
      })
      .style("stroke", function (d) {
        switch (d.group) {
          case "variables":
            return colors.variables;
          case "constants":
            return colors.constants;
          case "floatingHypotheses":
            return colors.floatingHypotheses;
          case "axiomaticAssertions":
            return colors.axiomaticAssertions;
          case "provableAssertions":
            return colors.provableAssertions;
          default:
            return "black";
        }
      });

    var nodeUpdate = node
      .transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

    nodeUpdate.select("text").style("fill-opacity", 1);

    var nodeExit = node
      .exit()
      .transition()
      .duration(duration)
      .attr("transform", function (d) {
        return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

    nodeExit.select("circle").attr("r", 0);

    nodeExit.select("text").style("fill-opacity", 0);

    var link = svgGroup.selectAll("path.link").data(links, function (d) {
      return d.target.id;
    });

    link
      .enter()
      .insert("path", "g")
      .attr("class", "link")
      .attr("d", function (d) {
        var o = {
          x: source.x0,
          y: source.y0,
        };
        return diagonal({
          source: o,
          target: o,
        });
      });

    link.transition().duration(duration).attr("d", diagonal);

    link
      .exit()
      .transition()
      .duration(duration)
      .attr("d", function (d) {
        var o = {
          x: source.x,
          y: source.y,
        };
        return diagonal({
          source: o,
          target: o,
        });
      })
      .remove();

    nodes.forEach(function (d) {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }

  var svgGroup = baseSvg.append("g");

  root = treeData;
  root.x0 = viewerHeight / 2;
  root.y0 = 0;

  update(root);
  centerNode(root);
};
