'use strict';
import expect from 'must';
import isClass from 'is-class';
import subject, {isContext} from '../src/mortar.js';

const NOOP = ()=> {
};
const FALSY_VALUES = [false, 0, '', null];

describe('{mortar}', () => {
	describe('module', () => {
		it('should be a class', () => {
			expect(isClass(subject)).to.be.true();
		});
		it('should be instantiatable', ()=> {
			const instance = new subject();
			expect(isContext(instance)).to.be.true();
		});
		it('should throw an error when called directly', ()=> {
			expect(() => {
				const instance = subject();
			}).to.throw(/cannot call/i);
		});
	});
	describe('Context', ()=> {
		/**
		 * @test {Context.providers}
		 */
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
		/**
		 * @test {Context.create}
		 */
		describe('.create()', () => {
			it('should create a Context instance', ()=> {
				const instance = subject.create();
				expect(isContext(instance)).to.be.true();
			});
		});
		/**
		 * @test {Context.getDependencies}
		 */
		describe('.getDependencies()', ()=> {
			it('should return all the dependencies of a function', ()=> {
				const f = (foo, baz, qux)=> {
				};
				expect(subject.getDependencies(f)).to.eql(['foo', 'baz', 'qux']);
			});
			it('should throw for anything else but a function', ()=> {
				FALSY_VALUES
					.concat({}, [], 0, undefined)
					.forEach(falsy=> {
						expect(()=> {
							subject.getDependencies(falsy);
						}).to.throw(/function/i);
					});
			});
		});
		/**
		 * @test {Context.register}
		 */
		describe('.register()', ()=> {
			it('should register a provider object', ()=> {
				subject.register({
					name     : 'answerToLifeTheUniverseAndEverything',
					configure: () => {
						return function return42() {
							return 42
						};
					}
				});
				const instance = subject.create();
				instance.wire(NOOP).as.answerToLifeTheUniverseAndEverything('constant');
				const value = instance.retrieve('constant');
				expect(value).to.equal(42);
			});
			it('should register a named function', ()=> {
				subject.register(function constant() {
					return function return42() {
						return 42
					};
				});
				const instance = subject.create();
				instance.wire(NOOP).as.constant('constant');
				const value = instance.retrieve('constant');
				expect(value).to.equal(42);
			});
			it('should throw an error when trying to re-register', ()=> {
				expect(()=> {
					subject.register({
						name  : 'singleton',
						create: ()=> {
						}
					});
				}).to.throw(/already registered/i);
			});
		});
		/**
		 * @test {Context#wire}
		 */
		describe('#wire()', ()=> {
			let instance;
			beforeEach(()=> {
				instance = new subject();
			});
			it('should throw an error when `subject` is `undefined`', ()=> {
				expect(()=> {
					instance.wire().as.value();
				}).to.throw(/undefined/i);
			});
			it('should allow registration of a function as a singleton', ()=> {
				instance.wire(NOOP).as.singleton('singleton');
				expect(instance.has('singleton')).to.be.true();
			});
			it('should allow registration of a function as a producer', ()=> {
				instance.wire(NOOP).as.producer('producer');
				expect(instance.has('producer')).to.be.true();
			});
			it('should allow registration of a value as a value', ()=> {
				instance.wire({}).as.value('value');
				expect(instance.has('value')).to.be.true();
			});
			it('should throw an error when `key` is already used', ()=> {
				instance.wire(NOOP).as.singleton('singleton');
				expect(()=> {
					instance.wire(NOOP).as.singleton('singleton');
				}).to.throw(/already exists/i);
			});
			it('should allow wiring falsy values', ()=> {
				FALSY_VALUES.forEach(falsy=> {
					expect(()=> {
						instance.wire(falsy);
					}, `allow wiring "${falsy}" as a value`).to.not.throw();
				});
			});
			it('should throw an error when using anything else but a string as a key', ()=> {
				FALSY_VALUES
					.concat({}, [], NOOP, undefined)
					.forEach((invalid)=> {
						expect(()=> {
							instance.wire(NOOP).as.value(invalid);
						}).to.throw(/cannot use/i);
					});
			});
		});
		/**
		 * @test {Context#require}
		 */
		describe('#require()', ()=> {
			let instance;
			it('should throw if no `module` was provided', ()=> {
				instance = new subject();
				expect(()=> instance.require('./fixtures/foo')).to.throw(/module/i);
			});
			it('should require the file and allow wiring it up as a singleton producer', ()=> {
				instance = new subject(module);
				instance.require('./fixtures/foo').as.singleton('foo');
				const value = instance.retrieve('foo');
				expect(instance.retrieve('foo')).to.equal(value);
			});
			it('should require the file and allow wiring it up as a producer', ()=> {
				instance = new subject(module);
				instance.require('./fixtures/foo').as.producer('foo');
				const value = instance.retrieve('foo');
				expect(instance.retrieve('foo')).to.not.equal(value);
			});
		});
		/**
		 * @test {Context#resolve}
		 */
		describe('#resolve()', ()=> {
			let instance;
			beforeEach(()=> {
				instance = new subject();
			});
			it('should resolve a function\'s dependencies', ()=> {
				instance.wire('foo').as.value('foo');
				instance.wire('baz').as.value('baz');
				instance.wire('qux').as.value('qux');
				const f = (foo, baz, qux)=> {
					return [foo, baz, qux]
				};
				const actual = instance.resolve(f);
				expect(actual).to.eql(['foo', 'baz', 'qux']);
			});
			it('should throw an error when a dependency is not found', ()=> {
				expect(()=> {
					instance.resolve(foo=>foo);
				}).to.throw(/not found/i);
			});
			it('should allow resolving a dependency with a falsy value', ()=> {
				FALSY_VALUES.forEach((falsy, key)=> {
					expect(()=> {
						instance
							.wire(falsy).as.value('foo')
							.resolve(foo=>foo)
					}, `allow resolving a dependency with "${falsy}" as a value`).to.not.throw();
					instance.release('foo');
				});
			});
			it('should throw an error when trying to resolve anything else but a function', ()=> {
				FALSY_VALUES
					.concat({}, [], undefined)
					.forEach((invalid)=> {
						expect(()=> {
							instance.resolve(invalid);
						}).to.throw(/function/i);
					});
			});
			it('should simply call a function without dependencies', ()=> {
				let called = false;
				instance.resolve(()=> {
					called = true;
				});
				expect(called).to.be.true();
			});
		});
		/**
		 * @test {Context#retrieve}
		 */
		describe('#retrieve()', ()=> {
			let instance;
			beforeEach(()=> {
				instance = new subject();
			});
			it('should throw an error when `key` is falsy');
			it('should throw an error when the key is not found', ()=> {
				expect(()=> {
					instance.retrieve('not found');
				}).to.throw(/not found/i);
			});
			it('should return the same instance for singletons', ()=> {
				instance.wire(() => ({})).as.singleton('singleton');
				var actual1 = instance.retrieve('singleton');
				var actual2 = instance.retrieve('singleton');
				expect(actual1).to.not.be.undefined();
				expect(actual1).to.equal(actual2);
			});
			it('should separate singleton instances for different keys', ()=> {
				const factory = () => ({});
				instance.wire(factory).as.singleton('s1');
				instance.wire(factory).as.singleton('s2');
				var actual1 = instance.retrieve('s1');
				var actual2 = instance.retrieve('s2');
				expect(actual1).to.not.equal(actual2);
			});
			it('should return a new instance for producers', ()=> {
				instance.wire(() => ({})).as.producer('producer');
				var actual1 = instance.retrieve('producer');
				var actual2 = instance.retrieve('producer');
				expect(actual1).to.not.equal(actual2);
			});
			it('should retrieve the upstream value when none is wired downstream', ()=> {
				const child = instance.spawn().spawn().spawn();
				instance.wire(42).as.value('the answer to life, the universe and everything ');
				expect(child.retrieve('the answer to life, the universe and everything ')).to.equal(42);
			});
			it('should retrieve the downstream value when overriding the upstream one', ()=> {
				const child = instance.spawn().spawn().spawn();
				instance.wire(0).as.value('the answer to life, the universe and everything ');
				child.wire(42).as.value('the answer to life, the universe and everything ');
				expect(child.retrieve('the answer to life, the universe and everything ')).to.equal(42);
			});
			it('should not retrieve the downstream value when the upstream one is requested', ()=> {
				const child = instance.spawn().spawn().spawn();
				instance.wire(0).as.value('the answer to life, the universe and everything ');
				child.wire(42).as.value('the answer to life, the universe and everything ');
				expect(instance.retrieve('the answer to life, the universe and everything ')).to.equal(0);
			});
			it('should not throw when the value is falsy', ()=> {
				FALSY_VALUES.forEach((falsy, key)=> {
					const keyStr = key.toString();
					instance.wire(falsy).as.value(keyStr);
					expect(()=> {
						instance.retrieve(keyStr);
					}, `allow retrieving a "${falsy}" value`).to.not.throw();
				});
			});
		});
		/**
		 * @test {Context#using}
		 */
		describe('#using()', ()=> {
			let instance;
			beforeEach(()=> {
				instance = new subject();
			});
			it('should allow overriding dependencies when resolving', ()=> {
				instance.wire(NOOP).as.singleton('foo');
				instance.wire('baz').as.value('baz');
				const [foo, baz] = instance
					.using({foo: 42})
					.resolve((foo, baz) => [foo, baz]);
				expect(foo).to.equal(42);
				expect(baz).to.equal('baz');
			});
			it('should throw an error when a dependency is not found', ()=> {
				expect(()=> {
					instance
						.using({foo: 42})
						.resolve((foo, baz)=>[foo, baz]);
				}).to.throw(/not found/i);
			});
			it('should not throw an error when overridden with a falsy value', ()=> {
				FALSY_VALUES.forEach((falsy)=> {
					expect(()=> {
						instance
							.using({foo: falsy})
							.resolve(foo=>foo);
					}, `allow overriding with "${falsy}" as a value`).to.not.throw();
				});
			});
			it('should throw an error when trying to resolve anything else but a function', ()=> {
				FALSY_VALUES
					.concat({}, [], undefined)
					.forEach((invalid)=> {
						expect(()=> {
							instance.using({}).resolve(invalid);
						}).to.throw(/function/i);
					});
			});
			it('should throw an error when trying to use anything else but a "real" object, Context or function', ()=> {
				FALSY_VALUES
					.concat([], undefined)
					.forEach((invalid)=> {
						expect(()=> {
							instance.using(invalid);
						}, `disallow using "${invalid}" for overriding dependencies`).to.throw(/object/i);
					});
			});
			it('should call a function to use its result for overriding dependencies', ()=> {
				const actual = instance.using(()=>({foo: 'foo'})).resolve((foo)=>foo);
				expect(actual).to.equal('foo');
			});
			it('should resolve a function to use its result for overriding dependencies', ()=> {
				instance.wire('baz').as.value('baz');
				const actual = instance.using((baz)=>({foo: baz})).resolve((foo)=>foo);
				expect(actual).to.equal('baz');
			});
			it('should allow using a different context for overriding dependencies', ()=> {
				const context = new subject();
				context.wire('foo').as.value('foo');
				const actual = instance.using(context).resolve((foo)=>foo);
				expect(actual).to.equal('foo');
			});
			it('should fallback to the current context when using a different context for overriding dependencies', ()=> {
				const context = new subject();
				context.wire('foo').as.value('foo');
				instance.wire('baz').as.value('baz');
				const [foo, baz] = instance.using(context).resolve((foo, baz)=>[foo, baz]);
				expect(foo).to.equal('foo');
				expect(baz).to.equal('baz');
			});
		});
		/**
		 * @test {Context#spawn}
		 */
		describe('#spawn()', ()=> {
			it('should create a child context', ()=> {
				const instance = new subject();
				const child = instance.spawn();
				expect(isContext(child)).to.be.true();
				expect(child.parent).to.equal(instance);
			});
		});
		/**
		 * @test {Context#release}
		 */
		describe('#release()', ()=> {
			it('should unregister a dependency', ()=> {
				const instance = new subject();
				instance.wire(NOOP).as.singleton('singleton');
				instance.release('singleton');
				expect(instance.has('singleton')).to.be.false();
			});
			it('should not throw when unregistering an unregistered dependency', ()=> {
				const instance = new subject();
				expect(()=> {
					instance.release('singleton');
				}).to.not.throw();
			});
		});
	});
});
