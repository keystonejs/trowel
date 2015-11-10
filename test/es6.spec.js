'use strict';
import expect from 'must';
import subject from '../es6.js';

const NOOP = ()=> {
};

describe('trowel (ES6)', () => {
	describe('module', () => {
		it('should be a function', () => {
			expect(subject).to.be.a.function();
		});
	});
	describe('Context', ()=> {
		describe('.providers', ()=> {
			it('should be an object', ()=> {
				expect(subject.providers).to.be.an.object();
			});
			it('should register a `singleton` provider', ()=> {
				expect(subject.providers.has('singleton')).to.be.true();
			});
			it('should register a `producer` provider', ()=> {
				expect(subject.providers.has('producer')).to.be.true();
			});
			it('should register a `value` provider', ()=> {
				expect(subject.providers.has('value')).to.be.true();
			});
		});
		describe('.getDependencies', ()=> {
			it('should return all the dependencies of a function', ()=> {
				const f = (foo, baz, qux)=> {
				};
				expect(subject.getDependencies(f)).to.eql(['foo', 'baz', 'qux']);
			});
		});
		describe('instances', ()=> {
			it('should be of type Context', ()=> {
				const instance = new subject();
				expect(subject.isContext(instance)).to.be.true();
			});
			describe('#wire', ()=> {
				it('should allow registration of a function as a singleton', ()=> {
					const instance = new subject();
					instance.wire(NOOP).as.singleton('singleton');
					expect(instance.has('singleton')).to.be.true();
				});
				it('should allow registration of a function as a producer', ()=> {
					const instance = new subject();
					instance.wire(NOOP).as.producer('producer');
					expect(instance.has('producer')).to.be.true();
				});
				it('should allow registration of a value as a value', ()=> {
					const instance = new subject();
					instance.wire({}).as.value('value');
					expect(instance.has('value')).to.be.true();
				});
			});
			describe('#resolve', ()=> {
				it('should resolve a function\'s dependencies', ()=> {
					const instance = new subject();
					instance.wire('foo').as.value('foo');
					instance.wire('baz').as.value('baz');
					instance.wire('qux').as.value('qux');
					const f = (foo, baz, qux)=> {
						return [foo, baz, qux]
					};
					const actual = instance.resolve(f);
					expect(actual).to.eql(['foo', 'baz', 'qux']);
				});
			});
			describe('#retrieve', ()=> {
				it('should return the same instance for singletons', ()=> {
					const instance = new subject();
					instance.wire(() => ({})).as.singleton('singleton');
					var actual1 = instance.retrieve('singleton');
					var actual2 = instance.retrieve('singleton');
					expect(actual1).to.not.be.undefined();
					expect(actual1).to.equal(actual2);
				});
				it('should return a new instance for producers', ()=> {
					const instance = new subject();
					instance.wire(() => ({})).as.producer('producer');
					var actual1 = instance.retrieve('producer');
					var actual2 = instance.retrieve('producer');
					expect(actual1).to.not.equal(actual2);
				});
			});
		});
	})
});