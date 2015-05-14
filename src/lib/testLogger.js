/**
 * Copyright (c) 2014, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */
'use strict';

var colors = require('./colors');

function VerboseLogger(config, customProcess){
  this._process = customProcess || process;
  this._config = config || {};
}

VerboseLogger.prototype.verboseLog = function(testResults){
  var testTree = _createTestTree(testResults);
  this.traverseTestResults(testTree);
}


/**
 * Prints test titles and their Ancestry with correct indentation.
 *
 * If the node contains test titles, then the test titles must be printed
 * before stepping lower into the hierarchy (`node.childNodes`). Otherwise
 * a header has been reached and must be printed before stepping lower into
 * the hierarchy.
 *
 * @param {Object} node - A test node with correct hierarchy for printing.
 * @param {String} indentation - Indentation for a given level in the hierarchy.
 *
 * @note:
 *   The amount of indentation is determined when stepping lower into the
 *   hierarchy.
 * @see{@link _createTestNode}
 * @see{@link _createTestTree}
 *
 */
VerboseLogger.prototype.traverseTestResults = function(node, indentation){
  var indentationIncrement;
  if (typeof node === 'undefined' || node === null){ return; }

  indentationIncrement = '  ';
  indentation = indentation || '';
  if (Object.prototype.toString.call(node.testTitles) === '[object Array]'){
    this.printTestTitles(node.testTitles, indentation);
    this.traverseTestResults(node.childNodes, indentation);
  } else {
    for (var key in node){
      this.log(indentation + key);
      this.traverseTestResults(node[key], indentation + indentationIncrement);
    }
  }
}

VerboseLogger.prototype.printTestTitles = function(testTitles, indentation){
  var outputColor;

  for (var i = 0; i < testTitles.length; i++){
    outputColor = testTitles[i].failureMessages.length === 0
      ? colors.GREEN
      : colors.RED;
    this.log(this._formatMsg(indentation + testTitles[i].title, outputColor));
  }
}

VerboseLogger.prototype.log = function(str){
  this._process.stdout.write(str + '\n');
}

VerboseLogger.prototype._formatMsg = function(msg, color) {
  if (this._config.noHighlight) {
    return msg;
  }
  return colors.colorize(msg, color);
}

/**
 * Prepares the test hierarchy for a `test title` by mapping its ancestry.
 *
 * @example
 * Test Structure A -
 *  describe('HeaderOne', function(){
 *    describe('HeaderTwo', function(){
 *      it('quacks like a duck', function(){
 *        expect(true).toBeTruthy();
 *      });
 *    });
 *  });
 *
 * Produces Test Node A -
 * {
 *   testTitles: [],
 *   childNodes: {
 *     HeaderOne: {
 *       testTitles: [],
 *       childNodes: {
 *         HeaderTwo: {
 *           testTitles: ['it quacks like a duck'],
 *           childNodes: {}
 *         }
 *       }
 *     }
 *   }
 * }
 *
 * @param {Object} testResult - An object containing a test title and its
 *                              pass/fail status.
 * @param {Array} ancestorTitles - Ancestor/describe headers associated with the
 *                                 given test title.
 * @param {Object} currentNode - A parent in the test hierarchy. Contains:
 *   1) Test titles associated with the current parent
 *   2) The next parent in the hierarchy.
 *
 * @return {Object} A node mapping the hierarchy of `test titles` with common
 *                  ancestors.
 */
function _createTestNode(testResult, ancestorTitles, currentNode){
  currentNode = currentNode || { testTitles: [], childNodes: {} };
  if (ancestorTitles.length === 0) {
    currentNode.testTitles.push(testResult);
  } else {
    if(!currentNode.childNodes[ancestorTitles[0]]){
      currentNode.childNodes[ancestorTitles[0]] = {
        testTitles: [],
        childNodes: {}
      };
    }
    _createTestNode(
      testResult,
      ancestorTitles.slice(1,ancestorTitles.length),
      currentNode.childNodes[ancestorTitles[0]]
    );
  }

  return currentNode;
}

/**
 *
 * Constructs a tree representing the hierarchy of a test run.
 *
 * @param {Array} testResults - Collection of tests.
 * @return {Object} Complete test hierarchy for a test run.
 *
 * @note: Here, a test run refers to a jest file. A tree is used
 *       to map all common ancestors (describe blocks) to individual
 *       test titles (it blocks) without repetition.
 * @see {@link _createTestNode}
 *
 */
function _createTestTree(testResults){
  var tree;
  for (var i = 0; i < testResults.length; i++){
    tree = _createTestNode(testResults[i], testResults[i].ancestorTitles, tree);
  }

  return tree;
}

module.exports = VerboseLogger;
