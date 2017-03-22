const filename = require('path').basename(__filename);
const fn = require(`../${filename}`);
import moment from 'moment';
const expect = require('chai').expect;
import invoke from './helpers/invoke_series_fn.js';
import getSeriesList from './helpers/get_single_series_list';
import _ from 'lodash';

describe(filename, function () {

  let comparable;
  let seriesList;
  beforeEach(function () {
    seriesList = require('./fixtures/seriesList.js')();
    comparable = getSeriesList('',[
      [moment.utc('1980-01-01T00:00:00.000Z'), 12],
      [moment.utc('1981-01-01T00:00:00.000Z'), 33],
      [moment.utc('1982-01-01T00:00:00.000Z'), 82],
      [moment.utc('1983-01-01T00:00:00.000Z'), -101],
    ]);
  });

  describe('a single number with', function () {
    it('eq', function () {
      return  invoke(fn, [seriesList, 'eq', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([-51, 0, 82, 20]);
      });
    });

    it('ne', function () {
      return  invoke(fn, [seriesList, 'ne', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 17, 0, 0]);
      });
    });

    it('gte', function () {
      return  invoke(fn, [seriesList, 'gte', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([-51, 0, 0, 0]);
      });
    });

    it('eq', function () {
      return  invoke(fn, [seriesList, 'gt', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([-51, 17, 0, 0]);
      });
    });

    it('eq', function () {
      return  invoke(fn, [seriesList, 'lt', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 17, 82, 20]);
      });
    });

    it('eq', function () {
      return  invoke(fn, [seriesList, 'lte', 17, 0]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 0, 82, 20]);
      });
    });
  });

  it('can compare against another series', function () {
    return  invoke(fn, [seriesList, 'ne', comparable, 0]).then(function (r) {
      expect(_.map(r.output.list[0].data, 1)).to.eql([0, 0, 82, 0]);
    });
  });

  it('can set the resultant value to that of another series', function () {
    return  invoke(fn, [seriesList, 'lt', comparable, comparable]).then(function (r) {
      expect(_.map(r.output.list[0].data, 1)).to.eql([12, 33, 82, 20]);
    });
  });

  it('can set the resultant value to null', function () {
    return  invoke(fn, [seriesList, 'lt', 17, null]).then(function (r) {
      expect(_.map(r.output.list[0].data, 1)).to.eql([null, 17, 82, 20]);
    });
  });

  describe('else', function () {
    it('has else', function () {
      return  invoke(fn, [seriesList, 'lt', 30, 0, 1]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 0, 1, 0]);
      });
    });

    it('works with other series', function () {
      return  invoke(fn, [seriesList, 'lt', 30, 0, comparable]).then(function (r) {
        expect(_.map(r.output.list[0].data, 1)).to.eql([0, 0, 82, 0]);
      });
    });
  });



});
